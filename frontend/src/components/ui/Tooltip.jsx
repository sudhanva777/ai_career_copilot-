import { useState } from 'react';

export default function Tooltip({ children, content, position = 'top' }) {
    const [show, setShow] = useState(false);

    const positions = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2'
    };

    return (
        <div
            className="relative inline-flex items-center"
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
        >
            {children}
            {show && (
                <div className={`absolute z-50 px-2 py-1 bg-bg2 border border-border2 rounded text-xs text-text2 whitespace-nowrap pointer-events-none ${positions[position]}`}>
                    {content}
                </div>
            )}
        </div>
    );
}
