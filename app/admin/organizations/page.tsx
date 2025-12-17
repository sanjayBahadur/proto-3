import { listOrganizations } from "@/app/actions/admin";
import OrgTable from "./OrgTable";

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Page({ searchParams }: PageProps) {
    const resolvedParams = await searchParams;
    const page = typeof resolvedParams.page === 'string' ? parseInt(resolvedParams.page) : 1;
    const limit = 10;
    const query = typeof resolvedParams.query === 'string' ? resolvedParams.query : undefined;
    const sort = typeof resolvedParams.sort === 'string' ? resolvedParams.sort : undefined;
    const order = typeof resolvedParams.order === 'string' ? (resolvedParams.order as 'asc' | 'desc') : undefined;

    const { data: organizations, count } = await listOrganizations({
        page, limit, query, sort, order
    });

    return <OrgTable organizations={organizations} totalCount={count} />;
}
