import Link from "next/link";
import { notFound } from "next/navigation";

import { getJobById } from "@/lib/store";

type Props = {
    params: Promise<{ id: string }>;
};

export default async function JobDetailPage({ params }: Props) {
    const { id } = await params;
    const job = await getJobById(id);

    if (!job) {
        notFound();
    }

    return (
        <section className="stack">
            <header>
                <p className="eyebrow-light">Job Detail</p>
                <h2 className="title">{job.title}</h2>
            </header>

            <article className="panel">
                <p>
                    <strong>Department:</strong> {job.department}
                </p>
                <p>
                    <strong>Location:</strong> {job.location}
                </p>
                <p>
                    <strong>Status:</strong> {job.status}
                </p>
                <p>
                    <strong>Openings:</strong> {job.openings}
                </p>
                <p>
                    <strong>Created:</strong> {new Date(job.createdAt).toLocaleString()}
                </p>

                <Link href="/jobs">Back to jobs</Link>
            </article>
        </section>
    );
}