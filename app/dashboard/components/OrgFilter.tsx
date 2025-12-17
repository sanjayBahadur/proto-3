"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Organization } from "@/app/actions/admin";

interface OrgFilterProps {
    organizations: Organization[];
}

export default function OrgFilter({ organizations }: OrgFilterProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentOrgId = searchParams.get("orgId") || "";

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const orgId = e.target.value;
        const params = new URLSearchParams(searchParams.toString());

        if (orgId) {
            params.set("orgId", orgId);
        } else {
            params.delete("orgId");
        }

        router.push(`/dashboard?${params.toString()}`);
    };

    return (
        <div className="flex items-center gap-2">
            <label htmlFor="orgId" className="text-sm font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                Filter by Org:
            </label>
            <select
                id="orgId"
                value={currentOrgId}
                onChange={handleChange}
                className="block w-full max-w-[200px] rounded-md border border-zinc-300 bg-white py-1.5 pl-3 pr-8 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
                <option value="">All Organizations</option>
                {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                        {org.name}
                    </option>
                ))}
            </select>
        </div>
    );
}
