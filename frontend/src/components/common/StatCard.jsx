import Card from '../ui/Card';
import Icon from '../ui/Icon';

export default function StatCard({ label, value, icon, color, subtitle, className = '' }) {
    return (
        <Card className={`flex flex-col gap-16 fade-up ${className}`}>
            <div className="flex items-start justify-between">
                <div
                    className="w-[40px] h-[40px] rounded-lg flex items-center justify-center border"
                    style={{
                        backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
                        borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
                        color: color
                    }}
                >
                    <Icon name={icon} size={20} />
                </div>
                <span
                    className="font-mono text-[28px] font-medium leading-none"
                    style={{ color }}
                >
                    {value !== undefined && value !== null ? value : '—'}
                </span>
            </div>

            <div className="flex flex-col gap-4">
                <span className="font-body text-[14px] font-medium text-text">
                    {label}
                </span>
                {subtitle && (
                    <span className="text-[12px] text-text3">
                        {subtitle}
                    </span>
                )}
            </div>
        </Card>
    );
}
