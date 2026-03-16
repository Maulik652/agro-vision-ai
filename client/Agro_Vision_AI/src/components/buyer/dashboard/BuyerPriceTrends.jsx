import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";

const data = [

  {day:"Mon",price:20},
  {day:"Tue",price:25},
  {day:"Wed",price:28},
  {day:"Thu",price:24},
  {day:"Fri",price:30}

]

export default function BuyerPriceTrends(){

  return(

    <div className="bg-white shadow rounded-xl p-6">

      <h2 className="font-semibold mb-4">
        Market Price Trend
      </h2>

      <ResponsiveContainer width="100%" height={250}>

        <LineChart data={data}>

          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip />

          <Line
            type="monotone"
            dataKey="price"
            stroke="#16a34a"
          />

        </LineChart>

      </ResponsiveContainer>

    </div>

  )

}