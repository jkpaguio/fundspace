import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import {
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  CalendarDays,
  Repeat2,
  ReceiptText,
} from 'lucide-react'
import { EmptyState } from '../../../components/common/EmptyState'
import { PageHeader } from '../../../components/common/PageHeader'
import { Button } from '../../../components/ui'
import { routes } from '../../../app/routes'
import { formatCurrency } from '../../../lib/formatCurrency'
import { useWorkspaceOutlet } from '../../../hooks/useWorkspaceOutlet'
import { listAccounts } from '../../accounts/services/accountService'
import { listCategories } from '../../categories/services/categoryService'
import { listRecurringTransactions } from '../../recurring/services/recurringService'
import { listTransactionsByDateRange } from '../services/transactionService'
import type { Account, Category, RecurringTransaction, Transaction } from '../../../types/domain'
import type { DatesSetArg, EventContentArg } from '@fullcalendar/core'

type CalendarDaySummary = {
  dateKey: string
  expenses: number
  income: number
  net: number
  recurringCount: number
  transferCount: number
  transferTotal: number
  transactions: Transaction[]
}

function getMonthLabel(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getCalendarVisibleRange(date: Date) {
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  const start = new Date(monthStart)
  const end = new Date(monthEnd)

  start.setDate(monthStart.getDate() - monthStart.getDay())
  end.setDate(monthEnd.getDate() + (6 - monthEnd.getDay()))

  return { end, start }
}

function buildTransferSummary(transactions: Transaction[]) {
  const processedTransferGroups = new Set<string>()
  let transferCount = 0
  let transferTotal = 0

  transactions.forEach((transaction) => {
    const isTransfer =
      transaction.type === 'transfer_in' || transaction.type === 'transfer_out'

    if (!isTransfer) {
      return
    }

    const groupKey = transaction.reference_group_id ?? transaction.id

    if (processedTransferGroups.has(groupKey)) {
      return
    }

    processedTransferGroups.add(groupKey)
    transferCount += 1
    transferTotal += transaction.amount
  })

  return { transferCount, transferTotal }
}

export function CalendarPage() {
  const { selectedWorkspace } = useWorkspaceOutlet()
  const workspaceCurrency = selectedWorkspace?.currency ?? 'PHP'
  const calendarRef = useRef<FullCalendar | null>(null)
  const [monthDate, setMonthDate] = useState(() => {
    const current = new Date()
    return new Date(current.getFullYear(), current.getMonth(), 1)
  })
  const [visibleRange, setVisibleRange] = useState(() => getCalendarVisibleRange(new Date()))
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedDateKey, setSelectedDateKey] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const loadCalendarData = useCallback(async () => {
    if (!selectedWorkspace) {
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const [nextTransactions, nextRecurringTransactions, nextAccounts, nextCategories] =
        await Promise.all([
          listTransactionsByDateRange(selectedWorkspace.id, visibleRange.start, visibleRange.end),
          listRecurringTransactions(selectedWorkspace.id),
          listAccounts(selectedWorkspace.id),
          listCategories(selectedWorkspace.id),
        ])

      setTransactions(nextTransactions)
      setRecurringTransactions(nextRecurringTransactions)
      setAccounts(nextAccounts)
      setCategories(nextCategories)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load calendar.')
    } finally {
      setIsLoading(false)
    }
  }, [selectedWorkspace, visibleRange.end, visibleRange.start])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadCalendarData()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadCalendarData])

  const daySummaryMap = useMemo(() => {
    const recurringMap = new Map<string, number>()

    recurringTransactions.forEach((item) => {
      if (!item.is_active) {
        return
      }

      const nextRunDate = new Date(`${item.next_run_date}T00:00:00`)

      if (nextRunDate < visibleRange.start || nextRunDate > visibleRange.end) {
        return
      }

      const dateKey = item.next_run_date
      recurringMap.set(dateKey, (recurringMap.get(dateKey) ?? 0) + 1)
    })

    const grouped = new Map<string, Transaction[]>()
    transactions.forEach((transaction) => {
      const dateKey = transaction.transaction_date
      const dayTransactions = grouped.get(dateKey) ?? []
      dayTransactions.push(transaction)
      grouped.set(dateKey, dayTransactions)
    })

    const summary = new Map<string, CalendarDaySummary>()
    grouped.forEach((dayTransactions, dateKey) => {
      const income = dayTransactions
        .filter((transaction) => transaction.direction === 'in' && transaction.type !== 'transfer_in')
        .reduce((total, transaction) => total + transaction.amount, 0)
      const expenses = dayTransactions
        .filter((transaction) => transaction.direction === 'out' && transaction.type !== 'transfer_out')
        .reduce((total, transaction) => total + transaction.amount, 0)
      const { transferCount, transferTotal } = buildTransferSummary(dayTransactions)

      summary.set(dateKey, {
        dateKey,
        expenses,
        income,
        net: income - expenses,
        recurringCount: recurringMap.get(dateKey) ?? 0,
        transactions: dayTransactions.sort((first, second) =>
          second.created_at.localeCompare(first.created_at),
        ),
        transferCount,
        transferTotal,
      })
    })

    recurringMap.forEach((count, dateKey) => {
      if (summary.has(dateKey)) {
        return
      }

      summary.set(dateKey, {
        dateKey,
        expenses: 0,
        income: 0,
        net: 0,
        recurringCount: count,
        transactions: [],
        transferCount: 0,
        transferTotal: 0,
      })
    })

    return summary
  }, [recurringTransactions, transactions, visibleRange.end, visibleRange.start])

  const visibleSelectedDateKey = useMemo(() => {
    const firstDateKey = toDateKey(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1))

    return selectedDateKey || firstDateKey
  }, [monthDate, selectedDateKey])

  const selectedDaySummary =
    daySummaryMap.get(visibleSelectedDateKey)
    ?? {
      dateKey: visibleSelectedDateKey,
      expenses: 0,
      income: 0,
      net: 0,
      recurringCount: 0,
      transactions: [],
      transferCount: 0,
      transferTotal: 0,
    }

  const selectedDayTransactions = useMemo(() => {
    const transferGroups = new Set<string>()

    return selectedDaySummary.transactions.filter((transaction) => {
      const isTransfer =
        transaction.type === 'transfer_in' || transaction.type === 'transfer_out'

      if (!isTransfer) {
        return true
      }

      const groupKey = transaction.reference_group_id ?? transaction.id

      if (transferGroups.has(groupKey)) {
        return false
      }

      transferGroups.add(groupKey)

      return true
    })
  }, [selectedDaySummary.transactions])

  const calendarEvents = useMemo(
    () =>
      Array.from(daySummaryMap.values()).map((summary) => ({
        allDay: true,
        display: 'block' as const,
        extendedProps: { summary },
        id: summary.dateKey,
        start: summary.dateKey,
        title: summary.dateKey,
      })),
    [daySummaryMap],
  )

  const renderCalendarEvent = useCallback(
    (eventInfo: EventContentArg) => {
      const summary = eventInfo.event.extendedProps.summary as CalendarDaySummary

      return (
        <div className="calendar-summary-event">
          {summary.income > 0 && (
            <span className="amount-in">
              +{formatCurrency(summary.income, workspaceCurrency)}
            </span>
          )}
          {summary.expenses > 0 && (
            <span className="amount-out">
              -{formatCurrency(summary.expenses, workspaceCurrency)}
            </span>
          )}
          {summary.transferCount > 0 && (
            <span className="calendar-inline-note">
              <ArrowRightLeft aria-hidden="true" size={12} />
              {summary.transferCount} transfer{summary.transferCount === 1 ? '' : 's'}
            </span>
          )}
          {summary.recurringCount > 0 && (
            <span className="calendar-inline-note">
              <Repeat2 aria-hidden="true" size={12} />
              {summary.recurringCount} recurring
            </span>
          )}
        </div>
      )
    },
    [workspaceCurrency],
  )

  const handleMonthShift = (direction: -1 | 1) => {
    const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + direction, 1)
    setSelectedDateKey(toDateKey(nextMonth))

    if (direction < 0) {
      calendarRef.current?.getApi().prev()
      return
    }

    calendarRef.current?.getApi().next()
  }

  const handleDatesSet = useCallback((dateInfo: DatesSetArg) => {
    const activeEnd = new Date(dateInfo.view.activeEnd)
    activeEnd.setDate(activeEnd.getDate() - 1)

    setMonthDate(new Date(dateInfo.view.currentStart))
    setVisibleRange({
      end: activeEnd,
      start: new Date(dateInfo.view.activeStart),
    })
  }, [])

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Calendar"
        heading="Track money by day"
        lead="Review monthly money movement at a glance, then open any day to inspect income, spending, transfers, and recurring activity for the active space."
      />

      {error && <p className="form-error">{error}</p>}

      {!selectedWorkspace ? (
        <EmptyState
          description="Choose a space first so the calendar only shows the money activity that belongs to that space."
          title="Select a space before opening Calendar"
        />
      ) : (
        <>
          <section className="calendar-preview-card">
            <div>
              <p className="eyebrow">Active space calendar</p>
              <h2>{selectedWorkspace.name}</h2>
              <p>
                Daily totals, recurring markers, and selected-day details stay scoped to this
                space so the ledger remains clear.
              </p>
            </div>
            <div className="dashboard-variant-tags">
              <span className="badge">{selectedWorkspace.type.replace('_', ' ')}</span>
              <span className="badge">{selectedWorkspace.currency}</span>
              <span className="badge">{getMonthLabel(monthDate)}</span>
            </div>
          </section>

          <section className="calendar-toolbar">
            <Button
              onClick={() => handleMonthShift(-1)}
              type="button"
              variant="secondary"
            >
              <ArrowLeft aria-hidden="true" size={16} />
              Prev
            </Button>
            <strong>{getMonthLabel(monthDate)}</strong>
            <Button
              onClick={() => handleMonthShift(1)}
              type="button"
              variant="secondary"
            >
              Next
              <ArrowRight aria-hidden="true" size={16} />
            </Button>
          </section>

          <section className="content-grid calendar-layout">
            <section className="list-panel">
              <div className="calendar-fullcalendar">
                <FullCalendar
                  datesSet={handleDatesSet}
                  dateClick={(dateInfo) => setSelectedDateKey(dateInfo.dateStr)}
                  dayCellClassNames={(dayInfo) =>
                    toDateKey(dayInfo.date) === visibleSelectedDateKey ? ['calendar-fc-day-selected'] : []
                  }
                  dayCellDidMount={(dayInfo) => {
                    dayInfo.el.dataset.dateKey = toDateKey(dayInfo.date)
                  }}
                  dayMaxEventRows={1}
                  displayEventTime={false}
                  eventClassNames={() => ['calendar-fc-summary-shell']}
                  eventClick={(eventInfo) => {
                    eventInfo.jsEvent.preventDefault()
                    setSelectedDateKey(eventInfo.event.startStr.slice(0, 10))
                  }}
                  eventContent={renderCalendarEvent}
                  events={calendarEvents}
                  fixedWeekCount
                  headerToolbar={false}
                  height="auto"
                  initialDate={monthDate}
                  initialView="dayGridMonth"
                  moreLinkClick="popover"
                  plugins={[dayGridPlugin, interactionPlugin]}
                  ref={calendarRef}
                  showNonCurrentDates
                />
              </div>
            </section>

            <section className="list-panel">
              <div className="section-heading">
                <h2>Day detail</h2>
                <span>
                  {selectedDaySummary.dateKey
                    ? new Date(`${selectedDaySummary.dateKey}T00:00:00`).toLocaleDateString()
                    : 'Pick a day'}
                </span>
              </div>

              <div className="record-list">
                <div className="record-row">
                  <span>
                    <strong>Income</strong>
                    <small>Incoming cash for the day</small>
                  </span>
                  <span className="amount-in">
                    {formatCurrency(selectedDaySummary.income, selectedWorkspace.currency)}
                  </span>
                </div>
                <div className="record-row">
                  <span>
                    <strong>Expenses</strong>
                    <small>Outgoing cash for the day</small>
                  </span>
                  <span className="amount-out">
                    {formatCurrency(selectedDaySummary.expenses, selectedWorkspace.currency)}
                  </span>
                </div>
                <div className="record-row">
                  <span>
                    <strong>Transfers moved</strong>
                    <small>
                      {selectedDaySummary.transferCount} transfer
                      {selectedDaySummary.transferCount === 1 ? '' : 's'} without double-counting cash flow
                    </small>
                  </span>
                  <span>{formatCurrency(selectedDaySummary.transferTotal, selectedWorkspace.currency)}</span>
                </div>
                <div className="record-row">
                  <span>
                    <strong>Daily net</strong>
                    <small>Income minus expenses</small>
                  </span>
                  <span className={selectedDaySummary.net >= 0 ? 'amount-in' : 'amount-out'}>
                    {selectedDaySummary.net >= 0 ? '+' : '-'}
                    {formatCurrency(Math.abs(selectedDaySummary.net), selectedWorkspace.currency)}
                  </span>
                </div>
                <div className="record-row">
                  <span>
                    <strong>Recurring markers</strong>
                    <small>Scheduled recurring entries due that day</small>
                  </span>
                  <span>{selectedDaySummary.recurringCount}</span>
                </div>
              </div>

              {isLoading ? (
                <p className="page-state">Loading this month&apos;s calendar...</p>
              ) : selectedDayTransactions.length === 0 ? (
                <EmptyState
                  description={
                    selectedDaySummary.recurringCount > 0
                      ? 'No transactions were recorded on this day yet, but recurring entries are scheduled for it.'
                      : 'No transactions were recorded on this day.'
                  }
                  title="Nothing recorded for this date"
                />
              ) : (
                <div className="record-list">
                  {selectedDayTransactions.map((transaction) => {
                    const account = accounts.find((item) => item.id === transaction.account_id)
                    const category = categories.find((item) => item.id === transaction.category_id)
                    const isTransfer =
                      transaction.type === 'transfer_in' || transaction.type === 'transfer_out'

                    return (
                      <div className="record-row record-row-stack" key={transaction.id}>
                        <span>
                          <strong>{transaction.notes || transaction.type.replace('_', ' ')}</strong>
                          <small>
                            {account?.name ?? 'Account'} / {category?.name ?? 'No category'} /{' '}
                            {isTransfer ? 'transfer activity' : transaction.type.replace('_', ' ')}
                          </small>
                        </span>
                        <span className="record-row-meta">
                          <strong className={transaction.direction === 'in' ? 'amount-in' : 'amount-out'}>
                            {transaction.direction === 'in' ? '+' : '-'}
                            {formatCurrency(transaction.amount, selectedWorkspace.currency)}
                          </strong>
                          <small>{new Date(transaction.created_at).toLocaleTimeString()}</small>
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </section>

          <section className="content-grid">
            <section className="list-panel">
              <div className="section-heading">
                <h2>Helpful next steps</h2>
                <span>Stay in flow</span>
              </div>

              <div className="more-grid">
                <NavLink className="more-nav-card" to={routes.add}>
                  <ArrowRightLeft aria-hidden="true" size={20} />
                  <div>
                    <strong>Open Quick Add</strong>
                    <p>Record a new income, expense, transfer, sale, or business expense right away.</p>
                  </div>
                </NavLink>
                <NavLink className="more-nav-card" to={routes.transactions}>
                  <ReceiptText aria-hidden="true" size={20} />
                  <div>
                    <strong>Open transactions</strong>
                    <p>Switch to the full ledger when you need filters, audit detail, or correction tools.</p>
                  </div>
                </NavLink>
                <NavLink className="more-nav-card" to={routes.recurring}>
                  <Repeat2 aria-hidden="true" size={20} />
                  <div>
                    <strong>Open recurring</strong>
                    <p>Review or adjust scheduled recurring entries that appear as day markers in the calendar.</p>
                  </div>
                </NavLink>
              </div>
            </section>

            <section className="budget-warning">
              <CalendarDays aria-hidden="true" size={20} />
              <div>
                <h2>How totals work</h2>
                <p>
                  Daily net uses income minus expenses. Transfer activity is shown separately so
                  moving money between your own accounts does not inflate or distort cash flow.
                </p>
              </div>
            </section>
          </section>
        </>
      )}
    </div>
  )
}
