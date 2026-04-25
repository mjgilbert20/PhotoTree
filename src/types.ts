import { Timestamp } from 'firebase/firestore';

export enum LeafStatus {
  ON_TREE = 'on_tree',
  FALLEN = 'fallen',
  RAKED = 'raked',
  GROWING = 'growing',
}

export interface Position {
  x: number;
  y: number;
}

export interface User {
  userId: string;
  displayName: string | null;
  photoURL: string | null;
  treeLevel: number;
  fertilizer: number;
  leafCount: number;
  updatedAt: Timestamp | any;
}

export interface Leaf {
  leafId: string;
  userId: string;
  imageUrl: string;
  status: LeafStatus;
  position: Position;
  branchIndex: number;
  createdAt: Timestamp | any;
  fallAt?: Timestamp | any;
}

export interface Connection {
  connectionId: string;
  userA: string;
  userB: string;
  createdAt: Timestamp | any;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}
