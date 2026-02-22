
// Fisher-Yates (aka Knuth) Shuffle Algorithm.
// This function shuffles an array in place and is highly efficient.
export const shuffleArray = <T>(array: T[]): T[] => {
    // Create a copy to avoid mutating the original array
    const shuffledArray = [...array];
    let currentIndex = shuffledArray.length;
    let randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex !== 0) {
        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [shuffledArray[currentIndex], shuffledArray[randomIndex]] = [
            shuffledArray[randomIndex],
            shuffledArray[currentIndex],
        ];
    }

    return shuffledArray;
};
