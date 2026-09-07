# CPSK Information Hub

## Project Details

This project is a software for managing information within the Computer Engineering and Software Engineering department, as currently, students in the department currently rely on many disconnected sources such as webpage, Google classroom, emails from professor and printed notices to find significant information/notices. This leads to two compounding problems: sometimes students doesn’t know which source is valid, and TAs/Lecturers were asked repeated question which increased workload.

## Project Documentation

- [Software Proposal](docs/4B%20-%20In-Class%20Exercise_%20Software%20Proposal%20-%20Finalised%20%281%29.pdf)
- [Software Requirement Specification](docs/UnpaidInternship_SRS_document.pdf)
- [Iteration Report: Iteration 1](docs/UnpaidInternship_SRS_document.pdf)
- [DrawIO diagram](docs/ISP.json)
- [Gantt Chart](docs/CPSK-HUB_Gantt_Chart.json)
- [SQD](docs/SQD1%20%26%20SQD%204.json)

## Project Members

- Dhechid Phumpaka (6810545603) ([@Khaomi](https://github.com/Khaomi))
- Varissara Arayavilaipong (6810545891) ([@varissarapong](https://github.com/varissarapong))
- Wiran Watanathira-anan (6810545913) ([@sleepycoffeejune](https://github.com/sleepycoffeejune))
- Chutikarn Stenger (6810545573) ([@chutikarnst](https://github.com/chutikarnst))

## Project Status

| Feature                   | Status                    |
|---------------------------|---------------------------|
| Login                     | Done                      |
| View Announcements        | In Progress               |
| Create/Edit Announcement  | In Progress               |
| Archive Announcement      | In Progress               |
| FAQs                      | Not Started               |
| Schedules                 | Not Started               |
| Contacts                  | Not Started               |
| Tag Management            | Not Started               |
| Keyword Search            | Not Started               |
| Database connection       | Not Started               |
| Deployment                | Not Started               |

## How to run

1. You'll first need a Supabase project which can be made [via the Supabase dashboard](https://database.new)

2. Use `cd` to change into the app's directory
```bash
cd source
```
 
3. Rename `.env.example` to `.env.local` and update the following:
```env
NEXT_PUBLIC_SUPABASE_URL=[INSERT SUPABASE PROJECT URL]
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=[INSERT SUPABASE PROJECT API PUBLISHABLE OR ANON KEY]
```

> [!NOTE]
> This example uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, which refers to Supabase's new **publishable** key format.
> Both legacy **anon** keys and new **publishable** keys can be used with this variable name during the transition period. Supabase's dashboard may show `NEXT_PUBLIC_SUPABASE_ANON_KEY`; its value can be used in this example.
> See the [full announcement](https://github.com/orgs/supabase/discussions/29260) for more information.

Both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` can be found in [your Supabase project's API settings](https://supabase.com/dashboard/project/_?showConnect=true)

4. Push the database migrations to Supabase
```bash
npx supabase db push
```

5. Configure the Redirect URL inside your Supabase project to allow your local environment
```
http://127.0.0.1:3000
http://127.0.0.1:3000/**
http://localhost:3000/
http://localhost:3000/**
```

6. You can now run the Next.js local development server:

```bash
pnpm run dev
```

The app should now be running on [localhost:3000](http://localhost:3000/).
