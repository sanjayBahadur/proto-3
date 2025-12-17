"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";

interface Organization {
    id: string;
    name: string;
}

export default function SignupPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<"manager" | "staff">("manager");

    // Org Selection State
    const [orgMode, setOrgMode] = useState<"create" | "join">("create");
    const [orgName, setOrgName] = useState("");
    const [selectedOrgId, setSelectedOrgId] = useState("");
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loadingOrgs, setLoadingOrgs] = useState(false);

    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [checkEmail, setCheckEmail] = useState(false);
    const { signup } = useAuth();
    const supabase = createClient();

    useEffect(() => {
        // Fetch organizations when component mounts (or when role becomes manager and mode is join, optimization)
        async function fetchOrgs() {
            setLoadingOrgs(true);
            const { data, error } = await supabase.rpc('get_organizations_for_signup');
            if (!error && data) {
                setOrganizations(data as Organization[]);
            }
            setLoadingOrgs(false);
        }

        fetchOrgs();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsSubmitting(true);

        // Validation for Manager Org fields
        if (role === 'manager') {
            if (orgMode === 'create' && !orgName.trim()) {
                setError("Please enter an organization name");
                setIsSubmitting(false);
                return;
            }
            if (orgMode === 'join' && !selectedOrgId) {
                setError("Please select an organization");
                setIsSubmitting(false);
                return;
            }
        }

        const { error, checkEmail } = await signup(
            email,
            password,
            role,
            role === 'manager' && orgMode === 'create' ? orgName : undefined,
            role === 'manager' && orgMode === 'join' ? selectedOrgId : undefined
        );

        if (error) {
            setError(error);
            setIsSubmitting(false);
        } else if (checkEmail) {
            setCheckEmail(true);
            setIsSubmitting(false);
        }
    };

    if (checkEmail) {
        return (
            <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-8">
                <div className="w-full max-w-sm text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                        <svg
                            className="h-6 w-6 text-green-600 dark:text-green-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                        Check your email
                    </h1>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                        We&apos;ve sent a confirmation link to <strong>{email}</strong>. Please
                        click the link to activate your account.
                    </p>
                    <div className="mt-8">
                        <Link
                            href="/login"
                            className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                        >
                            Back to Sign in
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-8">
            <div className="w-full max-w-sm">
                <div className="text-center">
                    <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                        Create an account
                    </h1>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                        Choose your role and enter your details
                    </p>
                </div>

                {error && (
                    <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-500 dark:bg-red-900/30 dark:text-red-400">
                        {error}
                    </div>
                )}

                <div className="mt-8 space-y-6">
                    {/* Role Selection */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setRole("manager")}
                            className={`flex flex-col items-center justify-center rounded-lg border p-4 text-center transition-all ${role === "manager"
                                    ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/20 dark:text-blue-400"
                                    : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                                }`}
                        >
                            <div className="font-medium">Manager</div>
                            <div className="mt-1 text-xs opacity-80">
                                Manages properties & staff
                            </div>
                        </button>
                        <button
                            onClick={() => setRole("staff")}
                            className={`flex flex-col items-center justify-center rounded-lg border p-4 text-center transition-all ${role === "staff"
                                    ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/20 dark:text-blue-400"
                                    : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                                }`}
                        >
                            <div className="font-medium">Staff</div>
                            <div className="mt-1 text-xs opacity-80">
                                Complete tasks
                            </div>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Manager: Org Selection/Creation */}
                        {role === 'manager' && (
                            <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                                <div className="flex gap-4 border-b border-zinc-200 pb-2 dark:border-zinc-700">
                                    <button
                                        type="button"
                                        onClick={() => setOrgMode('create')}
                                        className={`text-sm font-medium ${orgMode === 'create' ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'}`}
                                    >
                                        Create Organization
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setOrgMode('join')}
                                        className={`text-sm font-medium ${orgMode === 'join' ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'}`}
                                    >
                                        Join Existing
                                    </button>
                                </div>

                                {orgMode === 'create' ? (
                                    <div>
                                        <label htmlFor="orgName" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                            Organization Name
                                        </label>
                                        <input
                                            id="orgName"
                                            type="text"
                                            value={orgName}
                                            onChange={(e) => setOrgName(e.target.value)}
                                            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm placeholder-zinc-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                                            placeholder="e.g. Acme Corp Properties"
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <label htmlFor="orgSelect" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                            Select Organization
                                        </label>
                                        <select
                                            id="orgSelect"
                                            value={selectedOrgId}
                                            onChange={(e) => setSelectedOrgId(e.target.value)}
                                            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                                        >
                                            <option value="">Select an organization...</option>
                                            {organizations.map(org => (
                                                <option key={org.id} value={org.id}>{org.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}

                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                            >
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm placeholder-zinc-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                            />
                        </div>
                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                            >
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm placeholder-zinc-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                            />
                        </div>

                        <div className="rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                            {role === "manager"
                                ? "As a Manager, you will manage properties and staff. Your account will require Admin approval before you can access the dashboard."
                                : "Staff members require Admin approval before accessing the platform."}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                        >
                            {isSubmitting ? "Creating account..." : "Create account"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
