const blobs = [
  {
    size: "w-[500px] h-[500px] md:w-[700px] md:h-[700px]",
    position: "top-[15%] -left-[10%]",
    color: "bg-orange-500/[0.035]",
    animation: "heat-drift-1",
    blur: "blur-[100px]",
  },
  {
    size: "w-[400px] h-[400px] md:w-[600px] md:h-[600px]",
    position: "top-[40%] -right-[15%]",
    color: "bg-red-500/[0.03]",
    animation: "heat-drift-2",
    blur: "blur-[120px]",
  },
  {
    size: "w-[350px] h-[350px] md:w-[500px] md:h-[500px]",
    position: "top-[65%] left-[10%]",
    color: "bg-amber-500/[0.04]",
    animation: "heat-drift-3",
    blur: "blur-[90px]",
  },
  {
    size: "w-[300px] h-[300px] md:w-[450px] md:h-[450px]",
    position: "top-[25%] right-[20%]",
    color: "bg-orange-600/[0.025]",
    animation: "heat-drift-4",
    blur: "blur-[110px]",
  },
  {
    size: "w-[250px] h-[250px] md:w-[400px] md:h-[400px]",
    position: "top-[80%] right-[5%]",
    color: "bg-red-600/[0.03]",
    animation: "heat-drift-1",
    blur: "blur-[100px]",
  },
];

export default function HeatBlobs() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {blobs.map((blob, i) => (
        <div
          key={i}
          className={`absolute rounded-full ${blob.size} ${blob.position} ${blob.color} ${blob.blur}`}
          style={{ animation: `${blob.animation} ${20 + i * 5}s ease-in-out infinite` }}
        />
      ))}
    </div>
  );
}
