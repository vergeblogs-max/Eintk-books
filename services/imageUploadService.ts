
import { IMGBB_API_KEY } from '../constants';

export const uploadImage = async (imageFile: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('image', imageFile);

    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();
        
        if (result.success) {
            return result.data.url;
        } else {
            console.error('ImgBB upload error:', result.error.message);
            return null;
        }
    } catch (error) {
        console.error('Failed to upload image:', error);
        return null;
    }
};

export const base64ToFile = (base64: string, filename: string, mimeType: string = 'image/png'): File => {
    const bstr = atob(base64);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mimeType });
};
