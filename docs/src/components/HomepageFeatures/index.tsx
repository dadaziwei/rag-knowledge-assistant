import type { ReactNode } from "react";
import clsx from "clsx";
import Heading from "@theme/Heading";
import styles from "./styles.module.css";

type FeatureItem = {
  title: string;
  Png: string; // 改为字符串类型存储图片路径
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: "Visual-RAG",
    Png: require("@site/static/img/RAG.png").default, // 保持相同的引用方式
    description: (
      <>
        With pure visual embeddings, DaziKnow understands documents like a human —
        page by page, structure and all.
      </>
    ),
  },
  {
    title: "Agent-Workflow",
    Png: require("@site/static/img/workflow.png").default,
    description: (
      <>
        DaziKnow&apos;s Agent Workflow Engine thinks in LLM, sees in visuals, and
        builds your logic in Python — no limits, just intelligence.
      </>
    ),
  },
  {
    title: "Knowledge-Base",
    Png: require("@site/static/img/base.png").default,
    description: (
      <>
        The knowledge base supports nearly 100 types of file formats. It allows
        batch uploading and background asynchronous parsing.
      </>
    ),
  },
];

function Feature({ title, Png, description }: FeatureItem) {
  return (
    <div className={clsx("col col--4")}>
      <div className="text--center">
        {/* 使用img标签代替SVG组件 */}
        <img 
          className={styles.featureSvg} 
          src={Png} 
          alt={title} // 添加alt属性提高可访问性
          role="img"
        />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}