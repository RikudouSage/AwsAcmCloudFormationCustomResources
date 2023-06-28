export interface ValidationObject {
    [key: string]: {
        required: boolean;
        requiresReplacement: boolean;
        enum?: string[];
        pattern?: RegExp;
        transform?: (value: any) => any,
        defaultValue?: any;
    };
}
