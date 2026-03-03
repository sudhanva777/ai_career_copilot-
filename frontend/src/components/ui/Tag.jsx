export default function Tag({ label, variant = 'skill', onRemove }) {
    const baseClass = variant === 'skill' ? 'skill-tag' : 'skill-tag-gap';

    return (
        <span className={baseClass}>
            {label}
            {onRemove && (
                <button
                    onClick={onRemove}
                    className="ml-2 hover:opacity-75 focus:outline-none"
                    aria-label={`Remove ${label}`}
                >
                    &times;
                </button>
            )}
        </span>
    );
}
