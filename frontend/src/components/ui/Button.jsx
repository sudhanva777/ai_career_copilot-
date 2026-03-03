import Spinner from './Spinner';

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    fullWidth = false,
    className = '',
    disabled,
    ...rest
}) {
    const baseClass = `btn btn-${variant} btn-${size}`;
    const widthClass = fullWidth ? 'w-full' : '';
    const mergedClass = `${baseClass} ${widthClass} ${className}`.trim();

    return (
        <button
            className={mergedClass}
            disabled={disabled || loading}
            {...rest}
        >
            {loading ? (
                <>
                    <Spinner size={16} />
                    <span>...</span>
                </>
            ) : (
                <>
                    {icon}
                    {children && <span>{children}</span>}
                </>
            )}
        </button>
    );
}
