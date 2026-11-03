import {createContext,useContext} from 'react';
export const AccessContext=createContext<any>(null);
export const useAccess=()=>useContext(AccessContext);
