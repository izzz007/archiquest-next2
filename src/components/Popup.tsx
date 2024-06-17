export default function KeyValueTable({ data }: { data: any }) {
  return (
    <div className="flex flex-col">
      {data && Object.keys(data).length > 0 && (
        <>
          {Object.keys(data).map((key) => (
            <div key={key} className="flex gap-4">
              <div className="font-semibold">{key}:</div>
              <div className="flex flex-col">
                {typeof data[key] === "object" &&
                !Array.isArray(data[key]) &&
                data[key] !== null ? (
                  <KeyValueTable data={data[key]} />
                ) : Array.isArray(data[key]) ? (
                  data[key].join(",")
                ) : (
                  data[key]
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
