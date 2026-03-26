const blobs = [
  {
    size: "w-[400px] h-[400px] md:w-[700px] md:h-[700px]",
    position: "top-[10%] -left-[15%]",
    color: "bg-orange-500",
    opacity: 0.12,
    animation: "heat-drift-1",
    blur: "blur-[120px] md:blur-[200px]",
  },
  {
    size: "w-[350px] h-[350px] md:w-[600px] md:h-[600px]",
    position: "top-[35%] -right-[10%]",
    color: "bg-red-500",
    opacity: 0.08,
    animation: "heat-drift-2",
    blur: "blur-[130px] md:blur-[220px]",
  },
  {
    size: "w-[300px] h-[300px] md:w-[550px] md:h-[550px]",
    position: "top-[60%] left-[5%]",
    color: "bg-amber-500",
    opacity: 0.1,
    animation: "heat-drift-3",
    blur: "blur-[110px] md:blur-[200px]",
  },
  {
    size: "w-[250px] h-[250px] md:w-[450px] md:h-[450px]",
    position: "top-[20%] right-[15%]",
    color: "bg-orange-600",
    opacity: 0.07,
    animation: "heat-drift-4",
    blur: "blur-[140px] md:blur-[240px]",
  },
  {
    size: "w-[280px] h-[280px] md:w-[500px] md:h-[500px]",
    position: "top-[75%] right-[0%]",
    color: "bg-red-600",
    opacity: 0.09,
    animation: "heat-drift-5",
    blur: "blur-[120px] md:blur-[200px]",
  },
  {
    size: "w-[200px] h-[200px] md:w-[350px] md:h-[350px]",
    position: "top-[50%] left-[30%]",
    color: "bg-orange-400",
    opacity: 0.06,
    animation: "heat-drift-6",
    blur: "blur-[100px] md:blur-[180px]",
  },
  {
    size: "w-[320px] h-[320px] md:w-[500px] md:h-[500px]",
    position: "top-[85%] left-[20%]",
    color: "bg-amber-600",
    opacity: 0.1,
    animation: "heat-drift-2",
    blur: "blur-[130px] md:blur-[200px]",
  },
];

export default function HeatBlobs() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {blobs.map((blob, i) => (
        <div
          key={i}
          className={`absolute rounded-full ${blob.size} ${blob.position} ${blob.color} ${blob.blur}`}
          style={{
            animation: `${blob.animation} ${15 + i * 4}s ease-in-out infinite`,
            opacity: blob.opacity,
          }}
        />
      ))}
    </div>
  );
}
