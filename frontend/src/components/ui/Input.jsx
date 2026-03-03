export default function Input({
    label,
    type = 'text',
    error,
    icon,
    className = '',
    ...rest
}) {
    return (
        <div className={`flex flex-col gap-4 w-full ${className}`}>
            {label && (
                <label className="text-text2 text-sm font-body">
                    {label}
                </label>
            )}
            <div className="relative w-full">
                {icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text2">
                        {icon}
                    </div>
                )}
                <input
                    type={type}
                    className={`input-field ${icon ? 'pl-12' : ''} ${error ? 'error' : ''}`}
                    {...rest}
                />
            </div>
            {error && (
                <span className="text-coral text-xs font-mono mt-4" role="alert">
                    {error}
                </span>
            )}
        </div>
    );
}
