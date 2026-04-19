import { RefObject, useEffect } from 'react';

type ClickAwayHandler = (event: MouseEvent | TouchEvent) => void;
type ExcludeRef = RefObject<HTMLElement | null> | RefObject<HTMLElement | null>[] | null;

const useClickAway = (
  ref: RefObject<HTMLElement | null>, // 允许 null
  handler: ClickAwayHandler,
  excludeRef?: ExcludeRef
) => {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      // 检查是否在排除元素内
      if (excludeRef) {
        if (Array.isArray(excludeRef)) {
          // 排除多个元素
          if (excludeRef.some(r => r.current?.contains(event.target as Node))) {
            return;
          }
        } else {
          // 排除单个元素
          if (excludeRef.current?.contains(event.target as Node)) {
            return;
          }
        }
      }
      
      // 检查点击是否在目标元素内
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      
      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler, excludeRef]);
};

export default useClickAway;