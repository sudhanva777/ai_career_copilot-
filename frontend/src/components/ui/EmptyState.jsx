import Button from './Button';

export default function EmptyState({ emoji = '✨', title, description, action }) {
    return (
        <div className="flex flex-col items-center justify-center p-32 text-center w-full max-w-xs mx-auto">
            <div className="text-4xl mb-16">{emoji}</div>
            <h3 className="font-display font-medium text-lg mb-8">{title}</h3>
            {description && (
                <p className="text-text3 text-sm mb-24 max-w-xs">{description}</p>
            )}
            {action && (
                <Button variant="primary" onClick={action.onClick}>
                    {action.label}
                </Button>
            )}
        </div>
    );
}
