

export async function GET() {
    return new Response('Health check passed', { status: 200 });
}