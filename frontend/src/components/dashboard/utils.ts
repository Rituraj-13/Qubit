export function parseAIContent(raw: string): { answer: string; followUps: string[] } {
    const answerMatch = raw.match(/<ANSWER>([\s\S]*?)<\/ANSWER>/i);
    const followUpsMatch = raw.match(/<FOLLOW_UPS>([\s\S]*?)<\/FOLLOW_UPS>/i);
    const answer = answerMatch?.[1]?.trim() ?? raw.trim();
    const followUps: string[] = [];

    if (followUpsMatch) {
        const followUpsXml = followUpsMatch[1] ?? "";
        const qRegex = /<question>([\s\S]*?)<\/question>/gi;
        let m;
        while ((m = qRegex.exec(followUpsXml)) !== null) {
            const question = m[1]?.trim();
            if (question) followUps.push(question);
        }
    }

    return { answer, followUps };
}

export function getDomain(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./, "");
    } catch {
        return url;
    }
}
