import RabbitMQGraph from "../components/RabbitMQGraph";
import { analyze, GraphData, RelationsGraph } from "../lib/core/analyze"
import { BaseError } from "../lib/errors/base-error";

interface ProductsPageProps {
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
}

export default async function Page({ searchParams }: ProductsPageProps) {
  const { input } = await searchParams

  if (!input) {
    return (
      <div>
        <h1>Input is empty!</h1>
      </div>
    )
  }

  if (typeof input !== 'string') {
    return (
      <div>
        <h1>Input should be string</h1>
      </div>
    )
  }

  let data: GraphData | null = null

  try {
    data = await analyze(input)
  } catch (err) {
    if (err instanceof BaseError) {
      return (
        <div>
          <h1>{err.getMessage()}</h1>
        </div>
      )
    }
  }

  if (!data) {
    return <main>
      <h1>No data found</h1>
    </main>
  }

  const { nodes, links } = data

  return (
    <main style={{ padding: '2rem' }}>
      <h1>RabbitMQ Event Flow Visualization</h1>
      <p>Граф, построенный на основе данных из AST-парсера.</p>
      <RabbitMQGraph nodes={nodes} links={links} width={1200} height={800} />
    </main>
  );
}
