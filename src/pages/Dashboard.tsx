import { logout } from "../services/auth";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {

    const { user } = useAuth();

    const navigate = useNavigate();

    const handleLogout = async () => {

        await logout();

        navigate("/login");

    };

    return (

        <div className="p-10">

            <div className="flex justify-between">

                <div>

                    <h1 className="text-4xl font-bold">
                        Dashboard
                    </h1>

                    <p className="mt-2">
                        {user?.email}
                    </p>

                </div>

                <button
                    onClick={handleLogout}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg"
                >
                    Logout
                </button>

            </div>

        </div>

    );
}