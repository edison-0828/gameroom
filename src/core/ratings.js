export const limit = value => Math.max(0, Math.min(100, Math.round(value)));
export const totalScore = ratings => limit(ratings.design * .30 + ratings.content * .25 + ratings.art * .20 + ratings.stability * .25);

export const reviewCeiling = publishedCount => [78, 89, 94][publishedCount] ?? 100;
