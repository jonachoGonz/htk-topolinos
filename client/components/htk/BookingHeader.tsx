export default function BookingHeader() {
  return (
    <div className="w-full bg-[#0f1420] py-12 px-4 border-b border-[#1a1f2e]">
      <div className="max-w-6xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Reserva tu Clase
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
          Selecciona tu día y horario preferido para entrenar. Nuestras clases
          están diseñadas para maximizar tu rendimiento con máxima seguridad.
        </p>
      </div>
    </div>
  );
}
