// 外部に公開する型

type User = {
    id: Id;
    name: Label;
    image: string;
    createdAt: Date;
    myProjects: Array<Project>;
    editingProjects: Project;
};

type Project = {
    id: Id;
    leader: User;
    editor: Array<User>;
    name: Label;
    createdAt: Date;
    rootModule: Module;
};

type Module = {
    id: Id;
    name: Label;
    childModules: Array<Module>;
    editor: Array<User>;
    createdAt: Date;
    updateAt: Date;
};

type TypeDefinition = {
    id: Id;
    name: Label;
};

type TypeValue = {
    versionId: Id;
    versionDate: Date;
    name: Label;
    value: Array<Label>;
};

type PartDefinition = {
    id: Id;
    name: Label;
    createdAt: PartDefinition;
};

type Id = string & { idBrand: never };

type ImageDataUrl = string & { imageDataUrlBrand: never };

type Label = string & { simpleNameBrand: never };

const createRandomId = (): Id => {
    let id = "";
    const chars = "0123456789abcdefghijklmnopqrstuvwxyz";
    for (let i = 0; i < 22; i++) {
        id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id as Id;
};

const labelFromString = (text: string): Label => {
    if (text.length <= 0) {
        throw new Error("label length must be 0 < length");
    }
    if (!"abcdefghijklmnopqrstuvwxyz".includes(text[0])) {
        throw new Error("label first char must be match /[a-z]/");
    }
    for (const char of text.substring(1)) {
        if (
            !"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".includes(
                char
            )
        ) {
            throw new Error("label char must be match /[a-zA-Z0-9]/");
        }
    }
    return text as Label;
};
