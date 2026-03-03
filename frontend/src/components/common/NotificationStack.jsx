import { useContext } from 'react';
import { NotificationContext } from '../../context/NotificationContext';
import Icon from '../ui/Icon';

export default function NotificationStack() {
    const { notifications } = useContext(NotificationContext);

    if (notifications.length === 0) return null;

    const colorMap = {
        success: 'border-green',
        error: 'border-coral',
        warning: 'border-gold',
        info: 'border-cyan'
    };

    const dotColorMap = {
        success: 'bg-green',
        error: 'bg-coral',
        warning: 'bg-gold',
        info: 'bg-cyan'
    };

    return (
        <div className="fixed top-[24px] right-[24px] z-[9999] flex flex-col gap-[10px] pointer-events-none">
            {notifications.map((n) => (
                <div
                    key={n.id}
                    className={`glass-card p-16 flex items-center min-w-[300px] border-l-[3px] notification ${colorMap[n.type] || colorMap.info}`}
                >
                    <div className={`w-[6px] h-[6px] rounded-full mr-12 flex-shrink-0 ${dotColorMap[n.type] || dotColorMap.info}`} />
                    <span className="text-[14px] text-text font-body">{n.message}</span>
                </div>
            ))}
        </div>
    );
}
