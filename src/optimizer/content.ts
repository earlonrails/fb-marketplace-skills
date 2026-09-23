import { ContentOptimization, ListingItem } from '../types.js';

export class ContentOptimizer {
  static optimizeContent(item: ListingItem): ContentOptimization {
    const rawTitle = item.title.trim();

    // 1. Clean & Optimize Title
    // Capitalize first letter of each major word, trim excess spaces
    let cleanTitle = rawTitle
      .replace(/\s+/g, ' ')
      .replace(/!{2,}/g, '!')
      .replace(/\?{2,}/g, '?');

    // Ensure first character is uppercase
    if (cleanTitle.length > 0) {
      cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
    }

    // Append condition keyword if not present
    if (
      !/condition|brand new|like new|used|excellent|good/i.test(cleanTitle) &&
      cleanTitle.length < 65
    ) {
      cleanTitle = `${cleanTitle} - Great Condition`;
    }

    // 2. Clean & Optimize Description
    const baseDescription = item.description || `For sale: ${rawTitle}. In great condition and ready for pickup.`;

    const formattedDescription = `
${cleanTitle}

📌 Item Description & Condition:
${baseDescription.trim()}

⚡ Details:
• Tested & Working 100%
• Clean and well-maintained

🤝 Transaction Terms:
• Local pickup available
• Cash, Venmo, or Zelle accepted
• Feel free to message with any questions!
`.trim();

    // 3. Generate Listing Tags
    const tags = rawTitle
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(' ')
      .filter((w) => w.length > 2 && !['and', 'for', 'the', 'with', 'out'].includes(w))
      .slice(0, 10);

    return {
      itemId: item.id,
      originalTitle: rawTitle,
      recommendedTitle: cleanTitle,
      originalDescription: item.description || '',
      recommendedDescription: formattedDescription,
      recommendedTags: Array.from(new Set(tags)),
    };
  }
}
