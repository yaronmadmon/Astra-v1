export type CommandType = 'ADD_PAGE' | 'RENAME_PAGE' | 'DELETE_PAGE';

export interface AddPageCommand {
  type: 'ADD_PAGE';
  payload: {
    pageName: string;
  };
}

export interface RenamePageCommand {
  type: 'RENAME_PAGE';
  payload: {
    oldName: string;
    newName: string;
  };
}

export interface DeletePageCommand {
  type: 'DELETE_PAGE';
  payload: {
    pageName: string;
  };
}

export type Command = AddPageCommand | RenamePageCommand | DeletePageCommand;

