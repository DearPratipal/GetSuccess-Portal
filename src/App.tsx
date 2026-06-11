import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";

import Dashboard from "./pages/Dashboard";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import Subscription from "./dashboard/Subscription";
import MyExams from "./dashboard/MyExams";

import Layout from "./components/Layout";

import ProtectedRoute from "./routes/ProtectedRoute";

function App() {

    return (

        <BrowserRouter>

            <Routes>

                <Route path="/login" element={<Login />} />

                <Route path="/signup" element={<Signup />} />

                <Route
                    element={
                        <ProtectedRoute>
                            <Layout />
                        </ProtectedRoute>
                    }
                >

                    <Route
                        path="/dashboard"
                        element={<Dashboard />}
                    />

                    <Route
                        path="/leaderboard"
                        element={<Leaderboard />}
                    />

                    <Route
                        path="/profile"
                        element={<Profile />}
                    />

                    <Route
                        path="/subscription"
                        element={<Subscription />}
                    />

                    <Route
                        path="/my-exams"
                        element={<MyExams />}
                    />

                </Route>

            </Routes>

        </BrowserRouter>

    );
}

export default App;