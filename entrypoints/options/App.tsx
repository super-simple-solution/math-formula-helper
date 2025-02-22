import logo from '@/assets/icons/128.png'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useState } from 'react'
import { Feedback } from './components/feedback'
import { Preference } from './components/preference'
import { siderMenuList } from './const'

type TabValue = (typeof siderMenuList)[number]['value']
const defaultTab = siderMenuList[0].value

function App() {
  const [curTab, setCurTab] = useState<TabValue>(defaultTab)

  const contentMap: Record<TabValue, React.ReactNode> = {
    preference: <Preference />,
    feedback: <Feedback />,
  }

  return (
    <div className="flex h-screen justify-center">
      <div>
        <Tabs
          defaultValue={curTab}
          orientation="vertical"
          className="flex h-auto"
          onValueChange={(val: string) => setCurTab(val as TabValue)}
        >
          <div className="h-screen min-w-[240px] px-4">
            <div className="flex items-center pt-20">
              <img src={logo} alt="logo" className="w-10" />
              <div className="ml-4 font-bold text-xl">Latex Copy</div>
            </div>
            <TabsList className="mt-4 flex flex-col gap-1 justify-start">
              {siderMenuList.map((item) => (
                <TabsTrigger
                  className={`!shadow-none w-full justify-start rounded-xl py-3 hover:bg-slate-100 ${item.value === curTab ? '!bg-green-50 !text-green-500' : ''}`}
                  key={item.value}
                  value={item.value}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <div className="w-[700px] pl-4 border-l border-gray-200">
            {siderMenuList.map((item) => (
              <TabsContent className="flex-1 p-6" key={item.value} value={item.value}>
                {contentMap[item.value]}
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>
    </div>
  )
}

export default App
