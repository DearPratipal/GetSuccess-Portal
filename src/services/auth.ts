import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    GoogleAuthProvider,
    signInWithPopup
} from "firebase/auth";

import { auth } from "./firebase";

const provider = new GoogleAuthProvider();

export const signup = (
    email: string,
    password: string
) => {
    return createUserWithEmailAndPassword(
        auth,
        email,
        password
    );
};

export const login = (
    email: string,
    password: string
) => {
    return signInWithEmailAndPassword(
        auth,
        email,
        password
    );
};

export const googleLogin = () => {
    return signInWithPopup(
        auth,
        provider
    );
};

export const logout = () => {
    return signOut(auth);
};