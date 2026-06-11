import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout() {

    const { user } = useAuth();

    return (

        <div className="flex min-h-screen bg-slate-100">

            {/* Sidebar */}

            <aside className="w-64 bg-slate-900 text-white p-5">

                <h1 className="text-2xl font-bold mb-8">
                    GetSuccess
                </h1>

                <nav className="space-y-3">

                    <Link to="/dashboard" className="block">
                        Dashboard
                    </Link>

                    <Link to="/my-exams" className="block">
                        My Exams
                    </Link>

                    <Link to="/results" className="block">
                        Results
                    </Link>

                    <Link to="/leaderboard" className="block">
                        Leaderboard
                    </Link>

                    <Link to="/subscription" className="block text-yellow-400">
                        AI Exam Prime ⭐
                    </Link>

                    <Link to="/profile" className="block">
                        Profile
                    </Link>

                </nav>

            </aside>

            {/* Main */}

            <div className="flex-1">

                <header className="bg-white shadow px-6 py-4 flex justify-between">

                    <h2 className="font-bold text-xl">
                        GetSuccess Portal
                    </h2>

                    <div>

                        {user?.email}

                    </div>

                </header>

                <main className="p-6">

                    <Outlet />

                </main>

            </div>

        </div>

    );
}