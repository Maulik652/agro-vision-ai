export default function BuyerRecommendations({recommendations}){

  return(

    <div className="bg-white shadow rounded-xl p-6">

      <h2 className="font-semibold mb-4">
        AI Recommended Crops
      </h2>

      <div className="space-y-3">

        {recommendations.map((crop)=>(
          <div
            key={crop._id}
            className="flex justify-between"
          >

            <p>{crop.cropName}</p>

            <span className="text-green-600 text-sm">
              High Demand
            </span>

          </div>
        ))}

      </div>

    </div>

  )

}