import type { Models } from 'appwrite';

export interface PostModel extends Models.Document {
    content: string;
    userId: string;
    authorName: string;
}

export interface CommentModel extends Models.Document {
    content: string;
    postId: string;
    userId: string;
    authorName: string;
}

export interface BusinessModel extends Models.Document {
    name: string;
    category: string;
    shortDescription?: string;
}

export interface CircleModel extends Models.Document {
    name: string;
    description?: string;
}

export interface ChannelModel extends Models.Document {
    name: string;
    circleId: string;
}

export interface MessageModel extends Models.Document {
    content: string;
    channelId: string;
    userId: string;
    authorName: string;
}
