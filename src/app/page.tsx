export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <div className="h-full row-start-2 flex flex-col">
        <div className="flex flex-col flex-1 items-center justify-center">
          <h1 className="text-2xl text-center text-gray-600">Nest.JS RabbitMQ Visualizer</h1>
          <form action="/analyze" className="flex gap-2">
            <input name="input" className="py-2 px-2 shadow-sm rounded-sm border border-dashed border-black" type="text" />
            <button type="submit" className="py-2 px-2 bg-blue-700 hover:bg-blue-500 active:bg-blue-900 rounded-sm border border-solid border-blue-700 hover:border-transparent text-white font-bold cursor-pointer">Analize codebase</button>
          </form>
        </div>
        <h2 className="text-lg text-center text-gray-300">Powered by Next.JS</h2>
      </div>
    </div>
  );
}
