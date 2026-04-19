import io
import os
import subprocess
import tempfile
import textwrap
import time
import zipfile
import xml.etree.ElementTree as ET
from typing import List

from bson.objectid import ObjectId
from fastapi import UploadFile
from pdf2image import convert_from_bytes
from PIL import Image, ImageDraw, ImageFont, ImageSequence

from app.core.config import settings
from app.core.logging import logger
from app.db.miniodb import async_minio_manager
from app.utils.unoconverter import unoconverter


def _extract_docx_text(file_content: bytes) -> str:
    with zipfile.ZipFile(io.BytesIO(file_content)) as docx:
        xml_bytes = docx.read("word/document.xml")
    root = ET.fromstring(xml_bytes)
    namespace = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    paragraphs = []
    for paragraph in root.findall(".//w:p", namespace):
        texts = [node.text or "" for node in paragraph.findall(".//w:t", namespace)]
        line = "".join(texts).strip()
        if line:
            paragraphs.append(line)
    return "\n".join(paragraphs)


def _extract_plain_text(file_content: bytes) -> str:
    for encoding in ("utf-8", "gb18030", "latin-1"):
        try:
            return file_content.decode(encoding)
        except UnicodeDecodeError:
            continue
    return file_content.decode("utf-8", errors="ignore")


def extract_text_from_file(
    file_content: bytes,
    file_name: str | None = None,
    max_chars: int = 8000,
) -> str:
    file_extension = file_name.split(".")[-1].lower() if file_name else ""
    text = ""

    if file_extension == "pdf":
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=True) as temp_file:
            temp_file.write(file_content)
            temp_file.flush()
            result = subprocess.run(
                ["pdftotext", "-layout", temp_file.name, "-"],
                capture_output=True,
                check=True,
                timeout=20,
            )
        text = result.stdout.decode("utf-8", errors="ignore")
    elif file_extension == "docx":
        text = _extract_docx_text(file_content)
    elif file_extension in {"txt", "md", "markdown"}:
        text = _extract_plain_text(file_content)

    text = "\n".join(line.rstrip() for line in text.splitlines()).strip()
    if len(text) > max_chars:
        return text[:max_chars] + "\n..."
    return text


def _load_text_font(size: int = 26) -> ImageFont.ImageFont:
    font_paths = [
        "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for font_path in font_paths:
        if os.path.exists(font_path):
            try:
                return ImageFont.truetype(font_path, size=size)
            except OSError:
                continue
    return ImageFont.load_default()


def _text_to_images(text: str, title: str) -> List[Image.Image]:
    font = _load_text_font()
    title_font = _load_text_font(size=30)
    width, height = 1240, 1754
    margin = 72
    line_height = 38
    max_chars = max(24, (width - margin * 2) // 26)
    lines = []
    for raw_line in text.splitlines() or [""]:
        lines.extend(textwrap.wrap(raw_line, width=max_chars) or [""])

    pages = []
    lines_per_page = max(1, (height - margin * 2 - line_height * 2) // line_height)
    for start in range(0, len(lines), lines_per_page):
        image = Image.new("RGB", (width, height), "white")
        draw = ImageDraw.Draw(image)
        y = margin
        draw.text((margin, y), title[:80], fill="#111111", font=title_font)
        y += line_height * 2
        for line in lines[start:start + lines_per_page]:
            draw.text((margin, y), line, fill="#222222", font=font)
            y += line_height
        pages.append(image)
    return pages


async def _convert_via_unoserver_to_images(
    file_content: bytes,
    file_extension: str,
) -> List[Image.Image]:
    pdf_content = await unoconverter.async_convert(
        file_content,
        output_format="pdf",
        input_format=file_extension,
    )
    images = convert_from_bytes(pdf_content, dpi=int(settings.embedding_image_dpi))
    logger.debug(f"Converted {len(images)} pages from {file_extension} to PDF")
    return images


async def convert_file_to_images(
    file_content: bytes,
    file_name: str = None,
    handle_all_frames: bool = False,
) -> List[io.BytesIO]:
    start_time = time.time()
    file_extension = file_name.split(".")[-1].lower() if file_name else ""
    image_extensions = [
        "jpg",
        "jpeg",
        "png",
        "gif",
        "bmp",
        "webp",
        "ico",
        "tiff",
        "tif",
        "dib",
        "jfif",
        "pjpeg",
        "pjp",
    ]

    if file_extension in image_extensions:
        logger.info(f"Processing image file directly: {file_extension}")
        try:
            images = []
            with Image.open(io.BytesIO(file_content)) as img:
                if getattr(img, "is_animated", False) and handle_all_frames:
                    for frame in ImageSequence.Iterator(img):
                        frame = resize_image_to_a4(frame.convert("RGB"))
                        images.append(frame.copy())
                else:
                    if img.mode in ("RGBA", "P", "LA", "CMYK"):
                        img = img.convert("RGB")
                    images.append(resize_image_to_a4(img).copy())
            logger.debug(f"Processed {len(images)} frames from image")
        except Exception as e:
            logger.error(f"Image processing error: {str(e)}")
            raise RuntimeError(f"Image processing failed: {str(e)}")

    elif file_extension == "pdf":
        logger.info("Processing PDF directly")
        images = convert_from_bytes(file_content, dpi=int(settings.embedding_image_dpi))

    elif file_extension == "docx":
        logger.info("Converting docx file via unoserver")
        try:
            images = await _convert_via_unoserver_to_images(
                file_content=file_content,
                file_extension=file_extension,
            )
        except Exception as e:
            logger.warning(
                f"Unoserver docx conversion failed, falling back to text rendering: {str(e)}"
            )
            try:
                text = _extract_docx_text(file_content)
                if not text.strip():
                    text = f"No readable text extracted from {file_name}"
                images = _text_to_images(text, title=file_name or "document")
            except Exception as fallback_error:
                logger.error(f"Docx fallback rendering error: {str(fallback_error)}")
                raise RuntimeError(
                    f"Document conversion failed: {str(fallback_error)}"
                )

    elif file_extension in {"txt", "md", "markdown"}:
        logger.info(f"Rendering {file_extension} file as text images")
        try:
            text = _extract_plain_text(file_content)
            if not text.strip():
                text = f"No readable text extracted from {file_name}"
            images = _text_to_images(text, title=file_name or "document")
        except Exception as e:
            logger.error(f"Text rendering error: {str(e)}")
            raise RuntimeError(f"Document text rendering failed: {str(e)}")

    elif file_extension:
        logger.info(f"Converting {file_extension} file via unoserver")
        try:
            images = await _convert_via_unoserver_to_images(
                file_content=file_content,
                file_extension=file_extension,
            )
        except Exception as e:
            logger.error(f"Conversion error: {str(e)}")
            raise RuntimeError(f"Document conversion failed: {str(e)}")

    else:
        raise ValueError("Unsupported file type")

    images_buffer = []
    processing_start = time.time()
    try:
        for i, image in enumerate(images):
            buffer = io.BytesIO()
            image.save(buffer, format="PNG")
            buffer.seek(0)
            images_buffer.append(buffer)
            del image
            if (i + 1) % 10 == 0:
                logger.debug(f"Processed {i + 1} pages so far")
    except Exception as e:
        logger.error(f"Image processing failed: {str(e)}")
        for buf in images_buffer:
            buf.close()
        raise
    finally:
        del images

    total_time = time.time() - start_time
    processing_time = time.time() - processing_start
    logger.info(
        f"Successfully converted file to {len(images_buffer)} images | "
        f"Total: {total_time:.2f}s | Processing: {processing_time:.2f}s"
    )
    return images_buffer


def resize_image_to_a4(image: Image.Image) -> Image.Image:
    max_pixels = int(11.69 * int(settings.embedding_image_dpi))
    width, height = image.size
    if max(width, height) <= max_pixels:
        return image
    if width > height:
        new_width = max_pixels
        new_height = int(height * (max_pixels / width))
    else:
        new_height = max_pixels
        new_width = int(width * (max_pixels / height))
    return image.resize((new_width, new_height), Image.LANCZOS)


async def save_file_to_minio(username: str, uploadfile: UploadFile):
    file_name = (
        f"{username}_{os.path.splitext(uploadfile.filename)[0]}_"
        f"{ObjectId()}{os.path.splitext(uploadfile.filename)[1]}"
    )
    await async_minio_manager.upload_file(file_name, uploadfile)
    minio_url = await async_minio_manager.create_presigned_url(file_name)
    return file_name, minio_url


async def save_image_to_minio(username, filename, image_stream):
    file_name = f"{username}_{os.path.splitext(filename)[0]}_{ObjectId()}.png"
    await async_minio_manager.upload_image(file_name, image_stream)
    minio_url = await async_minio_manager.create_presigned_url(file_name)
    return file_name, minio_url
