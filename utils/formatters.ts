
export const formatPoints = (num: number): string => {
    if (num === undefined || num === null) return '0';
    
    if (num < 1000) {
        return num.toLocaleString();
    }
    
    if (num < 1000000) {
        // Thousands (1.1K)
        return parseFloat((num / 1000).toFixed(1)) + 'K';
    }
    
    if (num < 1000000000) {
        // Millions (1.25M)
        return parseFloat((num / 1000000).toFixed(2)) + 'M';
    }
    
    if (num < 1000000000000) {
        // Billions (1.5B)
        return parseFloat((num / 1000000000).toFixed(2)) + 'B';
    }
    
    // Trillions (1T)
    return parseFloat((num / 1000000000000).toFixed(2)) + 'T';
};
