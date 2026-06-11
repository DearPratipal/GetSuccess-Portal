import { useState } from "react";
import { login, googleLogin } from "../services/auth";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {

    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleLogin = async (
        e: React.FormEvent
    ) => {

        e.preventDefault();

        try {

            await login(email, password);

            navigate("/dashboard");

        } catch (err: any) {

            setError(err.message);

        }

    };

    const handleGoogle = async () => {

        try {

            await googleLogin();

            navigate("/dashboard");

        } catch (err: any) {

            setError(err.message);

        }

    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center">

            <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-lg">

                <h1 className="text-3xl font-bold text-center mb-6">
                    Login
                </h1>

                {error && (
                    <div className="bg-red-100 text-red-600 p-3 rounded mb-4">
                        {error}
                    </div>
                )}

                <form
                    onSubmit={handleLogin}
                    className="space-y-4"
                >

                    <input
                        type="email"
                        placeholder="Email"
                        className="w-full border p-3 rounded-lg"
                        value={email}
                        onChange={(e) =>
                            setEmail(e.target.value)
                        }
                    />

                    <input
                        type="password"
                        placeholder="Password"
                        className="w-full border p-3 rounded-lg"
                        value={password}
                        onChange={(e) =>
                            setPassword(e.target.value)
                        }
                    />

                    <button
                        className="w-full bg-blue-600 text-white p-3 rounded-lg"
                    >
                        Login
                    </button>

                </form>

                <button
                    onClick={handleGoogle}
                    className="w-full mt-4 border p-3 rounded-lg"
                >
                    Continue with Google
                </button>

                <p className="text-center mt-4">

                    Don't have an account?

                    <Link
                        to="/signup"
                        className="text-blue-600 ml-2"
                    >
                        Signup
                    </Link>

                </p>

            </div>

        </div>
    );
}