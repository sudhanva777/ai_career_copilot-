import Icon from '../ui/Icon';
import Badge from '../ui/Badge';

export default function ChatBubble({ role = 'user', message, score, isThinking = false }) {

    // Custom markdown parser for bold text (**text**)
    const parseMarkdown = (text) => {
        if (!text) return { __html: '' };
        // Replace **xxx** with <strong style="color:var(--cyan)">xxx</strong>
        const html = text.replace(
            /\*\*(.*?)\*\*/g,
            '<strong style="color:var(--cyan); font-weight: 600;">$1</strong>'
        )
            // Replace newlines with <br/>
            .replace(/\ng/, '<br/>');

        return { __html: html };
    };

    if (isThinking) {
        return (
            <div className="chat-bubble-ai flex flex-col gap-8 mb-16 fade-up">
                <div className="flex items-center gap-8 mb-4">
                    <div className="w-[28px] h-[28px] rounded flex items-center justify-center bg-[rgba(0,229,255,0.1)] border border-[rgba(0,229,255,0.2)]">
                        <Icon name="brain" size={14} className="text-cyan" />
                    </div>
                    <span className="font-mono text-[12px] text-cyan">AI Coach</span>
                </div>
                <div className="flex gap-4 p-8">
                    <div className="w-8 h-8 rounded-full bg-cyan" style={{ animation: 'dotsThink 1.4s infinite ease-in-out both', animationDelay: '-0.32s' }} />
                    <div className="w-8 h-8 rounded-full bg-cyan" style={{ animation: 'dotsThink 1.4s infinite ease-in-out both', animationDelay: '-0.16s' }} />
                    <div className="w-8 h-8 rounded-full bg-cyan" style={{ animation: 'dotsThink 1.4s infinite ease-in-out both' }} />
                </div>
            </div>
        );
    }

    if (role === 'ai') {
        return (
            <div className="flex flex-col gap-8 mb-24 max-w-[80%] fade-up">
                <div className="flex items-center gap-12 ml-4">
                    <div className="w-[28px] h-[28px] flex-shrink-0 rounded flex items-center justify-center bg-[rgba(0,229,255,0.1)] border border-[rgba(0,229,255,0.2)]">
                        <Icon name="brain" size={14} className="text-cyan" />
                    </div>
                    <span className="font-mono text-[12px] text-cyan uppercase tracking-wider">AI Coach</span>
                    {score !== undefined && score !== null && (
                        <Badge label={`${score}/10`} variant="score" score={score} />
                    )}
                </div>
                <div
                    className="chat-bubble-ai max-w-full font-body text-[15px] leading-relaxed text-text"
                    dangerouslySetInnerHTML={parseMarkdown(message)}
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 mb-24 max-w-[80%] ml-auto items-end fade-up">
            <div
                className="chat-bubble-user max-w-full font-body text-[15px] leading-relaxed text-text ml-0"
                dangerouslySetInnerHTML={parseMarkdown(message)}
            />
            <span className="font-mono text-[11px] text-text3 mr-4 uppercase tracking-wider">You</span>
        </div>
    );
}
