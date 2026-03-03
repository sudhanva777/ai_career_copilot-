export default function Badge({ label, variant = 'info', score }) {
    let finalVariant = variant;

    if (variant === 'score' && score !== undefined) {
        if (score >= 7) finalVariant = 'success';
        else if (score >= 5) finalVariant = 'warning';
        else finalVariant = 'error';
    }

    const baseStyle = "inline-flex items-center justify-center rounded-full px-3 py-1 font-mono text-xs border tracking-wider uppercase";

    const variants = {
        success: "bg-green/15 border-green/30 text-green",
        warning: "bg-gold/15 border-gold/30 text-gold",
        error: "bg-coral/15 border-coral/30 text-coral",
        info: "bg-cyan/15 border-cyan/30 text-cyan"
    };

    // Convert custom bg/border colors to inline styles or predefined classes
    let classNames = variants[finalVariant] || variants.info;

    // Actually use the specific score pills classes if applicable
    if (finalVariant === 'success') classNames = "score-pill-high " + baseStyle;
    else if (finalVariant === 'warning') classNames = "score-pill-mid " + baseStyle;
    else if (finalVariant === 'error') classNames = "score-pill-low " + baseStyle;
    else classNames = "bg-[rgba(0,229,255,0.15)] border-[rgba(0,229,255,0.3)] text-cyan " + baseStyle;

    return (
        <span className={classNames}>
            {label}
        </span>
    );
}
