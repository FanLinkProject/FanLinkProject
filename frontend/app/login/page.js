"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [email, setEmail] = useState("testuser04@example.com");
    const [password, setPassword] = useState("password123!");
    const router = useRouter();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch("http://localhost:8080/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password }),
            });

            if (!res.ok) {
                throw new Error("로그인 실패");
            }

            const data = await res.json();
            localStorage.setItem("accessToken", data.accessToken);
            alert("로그인 성공! 결제 테스트 페이지로 이동합니다.");
            router.push("/payment/test");
        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <div style={{ padding: "50px" }}>
            <h1>🔐 임시 로그인</h1>
            <form onSubmit={handleLogin}>
                <div>
                    <label>Email: </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{ margin: "10px" }}
                    />
                </div>
                <div>
                    <label>Password: </label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ margin: "10px" }}
                    />
                </div>
                <button type="submit" style={{ padding: "5px 10px" }}>
                    로그인
                </button>
            </form>
        </div>
    );
}
