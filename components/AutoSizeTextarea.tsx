import React, { useLayoutEffect, useRef } from 'react';

// Grow with the note, including after loading saved text or resizing the inspector.
export const AutoSizeTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = props => {
  const ref = useRef<HTMLTextAreaElement>(null);
  const resize = () => {
    const textarea = ref.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight + textarea.offsetHeight - textarea.clientHeight}px`;
  };

  useLayoutEffect(resize, [props.value]);
  useLayoutEffect(() => {
    const textarea = ref.current;
    if (!textarea) return;
    let lastWidth = textarea.clientWidth;
    const observer = new ResizeObserver(() => {
      if (textarea.clientWidth === lastWidth) return;
      lastWidth = textarea.clientWidth;
      resize();
    });
    observer.observe(textarea);
    return () => observer.disconnect();
  }, []);

  return <textarea {...props} ref={ref} style={{ ...props.style, overflow: 'hidden', overflowWrap: 'anywhere', wordBreak: 'break-word' }} />;
};
