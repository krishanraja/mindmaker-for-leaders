// src/components/onboarding/steps/BusinessContextStep.tsx
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { motion } from 'framer-motion'

interface BusinessContextStepProps {
  data: any
  onUpdate: (data: any) => void
  onNext: () => void
  onBack: () => void
}

const INDUSTRIES = [
  'SaaS',
  'Fintech',
  'Healthcare',
  'E-commerce',
  'Manufacturing',
  'Consulting',
  'Education',
  'Media',
  'Other',
]

const COMPANY_STAGES = [
  'Startup (0-50 employees)',
  'Growth (51-250 employees)',
  'Mid-Market (251-1000 employees)',
  'Enterprise (1000+ employees)',
]

const COMPANY_SIZES = [
  '1-10',
  '11-50',
  '51-250',
  '251-1000',
  '1000+',
]

export function BusinessContextStep({
  data,
  onUpdate,
  onNext,
  onBack,
}: BusinessContextStepProps) {
  const [role, setRole] = useState(data.role || '')
  const [title, setTitle] = useState(data.title || '')
  const [company, setCompany] = useState(data.company || '')
  const [industry, setIndustry] = useState(data.industry || '')
  const [companyStage, setCompanyStage] = useState(data.companyStage || '')

  const handleNext = () => {
    onUpdate({
      role,
      title,
      company,
      industry,
      companyStage,
    })
    onNext()
  }

  const isValid = role && title && company && industry && companyStage

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-[#00D9B6] mb-2">
          What do you do, and where?
        </h2>
        <p className="text-gray-400">
          A few basics so the AI can speak to your role and your business from the start.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Official Job Title *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., VP of Product"
            className="bg-gray-900 border-gray-700"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Functional Area *</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="bg-gray-900 border-gray-700">
              <SelectValue placeholder="Select your area" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Product">Product</SelectItem>
              <SelectItem value="Engineering">Engineering</SelectItem>
              <SelectItem value="Marketing">Marketing</SelectItem>
              <SelectItem value="Sales">Sales</SelectItem>
              <SelectItem value="Operations">Operations</SelectItem>
              <SelectItem value="Finance">Finance</SelectItem>
              <SelectItem value="HR">HR</SelectItem>
              <SelectItem value="Executive">Executive</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="company">Company Name *</Label>
          <Input
            id="company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="e.g., Acme Inc"
            className="bg-gray-900 border-gray-700"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="industry">Industry *</Label>
          <Select value={industry} onValueChange={setIndustry}>
            <SelectTrigger className="bg-gray-900 border-gray-700">
              <SelectValue placeholder="Select your industry" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map((ind) => (
                <SelectItem key={ind} value={ind}>
                  {ind}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            Used for benchmarking against similar leaders
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="companyStage">Company Stage *</Label>
          <Select value={companyStage} onValueChange={setCompanyStage}>
            <SelectTrigger className="bg-gray-900 border-gray-700">
              <SelectValue placeholder="Select company stage" />
            </SelectTrigger>
            <SelectContent>
              {COMPANY_STAGES.map((stage) => (
                <SelectItem key={stage} value={stage}>
                  {stage}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={!isValid}
          className="bg-[#00D9B6] hover:bg-[#00C4A3] text-black font-semibold"
        >
          Continue
        </Button>
      </div>
    </motion.div>
  )
}
