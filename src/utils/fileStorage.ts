
import { set, get, del } from 'idb-keyval';

export interface StoredFile {
    id: string;
    name: string;
    type: string;
    size: number;
    data: Blob;
    timestamp: number;
}

export const saveFile = async (file: File): Promise<string> => {
    const id = crypto.randomUUID();
    const storedFile: StoredFile = {
        id,
        name: file.name,
        type: file.type,
        size: file.size,
        data: file,
        timestamp: Date.now()
    };
    await set(id, storedFile);
    return id;
};

export const getFile = async (id: string): Promise<StoredFile | undefined> => {
    return await get(id);
};

export const deleteFile = async (id: string): Promise<void> => {
    await del(id);
};
