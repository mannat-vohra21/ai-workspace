import type { ProjectMemory } from "@/types";

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </h4>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">None yet</p>
      ) : (
        <ul className="list-inside list-disc text-sm text-gray-700">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function MemoryPanel({ memory }: { memory: ProjectMemory }) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900">Project Memory</h3>
      <Section title="Goals" items={memory.goals} />
      <Section title="Completed Work" items={memory.completedWork} />
      <Section title="Pending Tasks" items={memory.pendingTasks} />
      <Section title="Decisions" items={memory.decisions} />
    </div>
  );
}
