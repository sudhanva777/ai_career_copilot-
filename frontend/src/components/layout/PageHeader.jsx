export default function PageHeader({ eyebrow, title, subtitle, rightSlot }) {
    return (
        <div className="flex items-start justify-between w-full mb-32 fade-up-1">
            <div className="flex flex-col gap-4">
                {eyebrow && (
                    <span className="font-mono text-[11px] text-cyan tracking-[3px] uppercase">
                        {eyebrow}
                    </span>
                )}
                <h1 className="font-display font-extrabold text-[32px] text-text leading-tight">
                    {title}
                </h1>
                {subtitle && (
                    <p className="font-body text-[15px] text-text3 mt-4">
                        {subtitle}
                    </p>
                )}
            </div>
            {rightSlot && (
                <div className="flex-shrink-0">
                    {rightSlot}
                </div>
            )}
        </div>
    );
}
