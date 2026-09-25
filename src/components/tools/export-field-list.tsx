type ExportFieldListProps = {
  heading: string;
  description: string;
  note: string;
  fields: { title: string; description: string }[];
};

export function ExportFieldList({
  heading,
  description,
  note,
  fields,
}: ExportFieldListProps) {
  return (
    <section
      id="export-fields"
      className="scroll-mt-20 px-5 pb-20 sm:px-8 sm:pb-24"
    >
      <div className="mx-auto max-w-6xl">
        <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">
          {heading}
        </h2>
        <p className="text-muted-foreground mt-4 max-w-3xl leading-7">
          {description}
        </p>
        <dl className="mt-8 grid gap-x-10 md:grid-cols-2">
          {fields.map((field) => (
            <div
              key={field.title}
              className="border-border min-w-0 border-t py-4"
            >
              <dt className="font-medium">{field.title}</dt>
              <dd className="text-muted-foreground mt-2 leading-7 break-words">
                {field.description}
              </dd>
            </div>
          ))}
        </dl>
        <p className="bg-muted text-muted-foreground mt-6 rounded-xl p-5 leading-7">
          {note}
        </p>
      </div>
    </section>
  );
}
