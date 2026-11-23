# CPSK Information Hub

## Project Details

This project is a software for managing information within the Computer Engineering and Software Engineering department, as currently, students in the department currently rely on many disconnected sources such as webpage, Google classroom, emails from professor and printed notices to find significant information/notices. This leads to two compounding problems: sometimes students doesn’t know which source is valid, and TAs/Lecturers were asked repeated question which increased workload.

## Project Documentation

- [Software Proposal](docs/4B%20-%20In-Class%20Exercise_%20Software%20Proposal%20-%20Finalised%20%281%29.pdf)
- [Software Requirement Specification](docs/UnpaidInternship_SRS_document.pdf)
- [Iteration Report: Iteration 1](docs/ISP-SKE26_Iteration_1_by_UnpaidInternship.pdf)
- [Iteration Report: Iteration 2](docs/ISP-SKE26_Iteration_2_by_UnpaidInternship.pdf)
- [Iteration Report: Iteration 3](docs/ISP-SKE26_Iteration_3_by_UnpaidInternship.pdf)
- [Iteration Report: Iteration 4](docs/ISP-SKE26_Iteration_4_by_UnpaidInternship.pdf)
- [Iteration Report: Iteration 5](docs/ISP-SKE26_Iteration_5_by_UnpaidInternship.pdf)
- [DrawIO diagram](docs/ISP.json)
- [Gantt Chart](docs/CPSK-HUB_Gantt_Chart.json)
- [SQD](docs/SQD1_%26_SQD4.json)

## Project Members

- Dhechid Phumpaka (6810545603) ([@Khaomi](https://github.com/Khaomi))
- Varissara Arayavilaipong (6810545891) ([@varissarapong](https://github.com/varissarapong))
- Wiran Watanathira-anan (6810545913) ([@sleepycoffeejune](https://github.com/sleepycoffeejune))
- Chutikarn Stenger (6810545573) ([@chutikarnst](https://github.com/chutikarnst))

## Project Status

| Feature                   | Status                    |
|---------------------------|---------------------------|
| Login                     | Done                      |
| View Announcements        | Done                      |
| Create/Edit Announcement  | Done                      |
| Archive Announcement      | Done                      |
| FAQs                      | Done                      |
| Schedules                 | Done                      |
| Contacts                  | Done                      |
| Tag Management            | Done                      |
| Keyword Search            | Done                      |
| Database connection       | Done                      |
| Deployment                | Done                      |

## How to run

1. You'll first need a Supabase project which can be made [via the Supabase dashboard](https://supabase.com).

2. Configure the Redirect URL inside your Supabase project to allow your local environment.
```
http://127.0.0.1:3000
http://127.0.0.1:3000/**
http://localhost:3000/
http://localhost:3000/**
```

3. Go to [Google Cloud Console](https://console.cloud.google.com/cloud-resource-manager) and create a new project.

4. Head to [Google's Auth Platform](https://console.cloud.google.com/auth/overview) and select your newly created project.

5. Create a new Client and save client id and client secret.

6. Go to Supabase > Project > Auth > Providers > Google and Enable it, putting in the Client ID and Client Secret

7. Copy the Redirect URL on the Supabase page and go back to Google's Auth Platform, open the client and add the redirect url to allow list.

8. Use `cd` to change into the app's directory
```bash
cd source
```
 
9. Copy `.env.example` to `.env` and update the following:
```env
NEXT_PUBLIC_SUPABASE_URL=[INSERT SUPABASE PROJECT URL]
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=[INSERT SUPABASE PROJECT API PUBLISHABLE OR ANON KEY]
```

> [!NOTE]
> This example uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, which refers to Supabase's new **publishable** key format.
> Both legacy **anon** keys and new **publishable** keys can be used with this variable name during the transition period. Supabase's dashboard may show `NEXT_PUBLIC_SUPABASE_ANON_KEY`; its value can be used in this example.
> See the [full announcement](https://github.com/orgs/supabase/discussions/29260) for more information.

Both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` can be found in [your Supabase project's API settings](https://supabase.com/dashboard/project/)

10. Install `pnpm` if you haven't.
```
npm install -g pnpm
```

11. Install dependencies
```
pnpm install
```

12. Push the database migrations to Supabase.
```bash
pnx supabase db push
```

13. You can now run the Next.js local development server:
```bash
pnpm run dev
```

The app should now be running on [localhost:3000](http://localhost:3000/).
