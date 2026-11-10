import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbDatepickerModule, NgbModal, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { debounceTime, firstValueFrom, Subject, takeUntil } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';

interface ProjectFormModel {
  id: string;
  name: string;
  projectTypeId: number;
  projectBilleableId: number;
  productId: number;
  clientId: string;
  startDate: { year: number; month: number; day: number };
  endDate: { year: number; month: number; day: number };
  status: number;
  templateMaster: string;
  userManager: string;
  ticketCategoriesParentId: number;
  ticketBaseHours: number;
}

@Component({
  selector: 'app-project-create',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbDatepickerModule, NgbNavModule],
  styleUrls: ['./project-create.component.css'],
  templateUrl: './project-create.component.html',
})
export class ProjectCreateComponent implements OnDestroy {
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  modalService = inject(NgbModal);

  readonly moduleId = 2001;

  get canAccessPage(): boolean {
    return this.authService.hasPermission(this.moduleId, 'c');
  }

  active : number = 1;
  clients: any[] = [];
  projectTypes: any[] = [];
  projectBilleables: any[] = [];
  products: any[] = [];
  ticketCategories: any[] = [];
  allUsers: any[] = [];
  users: any[] = [];
  task: any[] = [];
  draftActive = 1;
  draftTaskCategories: any[] = [];
  taskModules: any[] = [];
  savingTask = false;
  addTaskGroupId: number | null = null;
  newTaskForm: any = { title: '', description: '', ticketCategoryId: null, assignTo: '', productChildId: '', targetCompletionDate: null };
  editingTaskId: string | null = null;
  editTaskForm: any = { title: '', description: '', ticketCategoryId: null, assignTo: '', productChildId: '', targetCompletionDate: null };
  draggedDraftTask: any = null;

  loadingOptions = false;
  saving = false;
  deleting = false;
  errorMessage = '';
  autoSaving = false;
  draftSaved = false;
  autoSaveError = '';
  private draftLoaded = false;
  private pendingAutoSave = false;
  private readonly autoSave$ = new Subject<void>();
  private readonly destroy$ = new Subject<void>();
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private savedUsers: any[] = [];
  userSearchKeyword = '';
  divisionFilter = '';

  formModel: ProjectFormModel = this.defaultForm();
  loadingTemplateMaster: boolean = false;
  templateName: string = '';
  listOfTemplateMaster: any[] = [];
  userId: string = '';
  draftId = '';
  constructor() {
    // tolong ambil userId yang di simpan di localStorage 8tt_auth_token dalam bentuk jwt token
   
      this.userId = this.authService.currentUser?.id || '';
    this.draftId = String(this.route.snapshot.paramMap.get('id') || '').trim();

    if (!this.canAccessPage) {
      return;
    }

    if (!this.draftId) {
      void this.router.navigate(['/projects']);
      return;
    }

    void this.loadOptions();
    this.loadDraft();

    this.autoSave$
      .pipe(debounceTime(1000), takeUntil(this.destroy$))
      .subscribe(() => this.saveDraft());
  }

  async loadOptions(): Promise<void> {
    this.loadingOptions = true;

    try {
      const [
        clientResponse,
        projectTypeResponse,
        projectBilleableResponse,
        productResponse,
        userResponse,
        ticketCategoriesResponse,
        templateMasterResponse,
      ] = await Promise.all([
        firstValueFrom(this.apiService.get('/client', { matchUserProduct: 1 })),
        firstValueFrom(
          this.apiService.get('/master/project-type', { status: 1 }),
        ),
        firstValueFrom(
          this.apiService.get('/master/project-billeable', { status: 1 }),
        ),
        firstValueFrom(
          this.apiService.get('/product-master', { status: 1, parentId: 0, matchUserProduct: 1 }),
        ),
        firstValueFrom(this.apiService.get('/user', { status: 1 , userTypeId: 1})),
        firstValueFrom(
          this.apiService.get('/ticket-categories', { status: 1, parentId: 0 }),
        ),
        firstValueFrom(this.apiService.get('/template')),
      ]);

      this.clients = Array.isArray(clientResponse?.data)
        ? clientResponse.data
        : [];
      this.projectTypes = Array.isArray(projectTypeResponse?.data)
        ? projectTypeResponse.data
        : [];
      this.projectBilleables = Array.isArray(projectBilleableResponse?.data)
        ? projectBilleableResponse.data
        : [];
      this.products = Array.isArray(productResponse?.data)
        ? productResponse.data
        : [];
      this.ticketCategories = Array.isArray(ticketCategoriesResponse?.data)
        ? ticketCategoriesResponse.data
        : [];
      this.listOfTemplateMaster = Array.isArray(templateMasterResponse?.data)
        ? templateMasterResponse.data
        : [];

      const users = Array.isArray(userResponse?.data) ? userResponse.data : [];
      this.allUsers = users.map((user: any) => ({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        userAuthLevel: user.userAuthLevel || '',
        checked: user.id == this.userId ? true : false,
        readonly: user.id == this.userId ? true : false,
        division: user.division || '',
        asManager: false,
      }));
      this.users = [...this.allUsers];
      this.mergeSavedUsers();
    } catch {
      this.clients = [];
      this.projectTypes = [];
      this.projectBilleables = [];
      this.products = [];
      this.ticketCategories = [];
      this.allUsers = [];
      this.users = [];
      this.listOfTemplateMaster = [];
    } finally {
      this.loadingOptions = false;
    }
  }

  reload() {
    location.reload();
  }
  toggleManager(index: number): void {
    const selectedUser = this.users[index];

    if (!selectedUser) {
      return;
    }

    this.allUsers.forEach((user: any) => {
      user.asManager = false;
    });

    selectedUser.asManager = true;
    selectedUser.checked = true;
    this.formModel.userManager = selectedUser.name;

    this.scheduleAutoSave();
  }

  toggleUserChecked(user: any): void {
    if (!user || user.readonly) {
      return;
    }

    user.checked = !user.checked;
    this.scheduleAutoSave();
  }

  get divisionOptions(): string[] {
    const divisions = this.allUsers
      .map((user: any) => String(user.division ?? '').trim())
      .filter((division: string) => division.length > 0);

    return Array.from(new Set(divisions)).sort((a, b) => a.localeCompare(b));
  }

  searchUsers(): void {
    const keyword = this.userSearchKeyword.trim().toLowerCase();
    const division = this.divisionFilter.trim().toLowerCase();

    this.users = this.allUsers.filter((user: any) => {
      const name = String(user.name || '').toLowerCase();
      const id = String(user.id || '');
      const userDivision = String(user.division || '').toLowerCase();

      const matchesKeyword = !keyword || name.includes(keyword) || id.includes(keyword);
      const matchesDivision = !division || userDivision === division;

      return matchesKeyword && matchesDivision;
    });
  }

  loadDraft(): void {
    this.apiService.get(`/project/detail/${this.draftId}`).subscribe({
      next: (response) => {
        const data = response?.data ?? null;

        if (!data) {
          this.errorMessage = 'Draft project not found.';
          return;
        }

        this.applyDraftToForm(data);
        this.savedUsers = Array.isArray(data?.users) ? data.users : [];
        this.mergeSavedUsers();
        this.draftLoaded = true;
        void this.loadDraftTasks();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Failed to load draft project.';
      },
    });
  }

  async loadDraftTasks(): Promise<void> {
    if (!this.draftId) {
      return;
    }

    const parentId = Number(this.formModel.ticketCategoriesParentId);
    const categoriesRequest = parentId > 0
      ? this.apiService.get('/ticket-categories', { status: 1, parentId })
      : null;

    try {
      const [taskResponse, categoriesResponse] = await Promise.all([
        firstValueFrom(this.apiService.get('/project/draftTasks', { projectId: this.draftId, ticketTypeId: 1 })),
        categoriesRequest ? firstValueFrom(categoriesRequest) : Promise.resolve(null),
      ]);

      const grouped = Array.isArray(taskResponse?.data) ? taskResponse.data : [];
      this.draftTaskCategories = Array.isArray(categoriesResponse?.data) ? categoriesResponse.data : [];
      this.task = this.mergeDraftTasksWithCategories(grouped, this.draftTaskCategories);
    } catch {
      this.task = [];
      this.draftTaskCategories = [];
    }
  }

  private mergeDraftTasksWithCategories(grouped: any[], categories: any[]): any[] {
    const result = categories.map((category: any) => {
      const match = grouped.find((group: any) => Number(group?.id) === Number(category.id));

      return {
        id: category.id,
        name: String(category.name || ''),
        sorting: Number(category.sorting ?? category.weight ?? 0),
        data: match && Array.isArray(match.data) ? match.data : [],
      };
    });

    const knownIds = new Set(categories.map((c: any) => Number(c.id)));

    for (const group of grouped) {
      if (!knownIds.has(Number(group.id))) {
        result.push({
          id: group.id,
          name: String(group.name || group.id || 'Unknown'),
          sorting: Number(group.sorting ?? 0),
          data: Array.isArray(group.data) ? group.data : [],
        });
      }
    }

    return result.sort((a, b) => a.sorting - b.sorting || String(a.name).localeCompare(String(b.name)));
  }

  private defaultDraftTaskForm(): any {
    return { title: '', description: '', ticketCategoryId: null, assignTo: '', productChildId: '', targetCompletionDate: null };
  }

  startAddTask(group: any): void {
    this.newTaskForm = this.defaultDraftTaskForm();
    this.newTaskForm.ticketCategoryId = Number(group.id);
    this.addTaskGroupId = Number(group.id);
    this.loadTaskModules();
  }

  cancelAddTask(): void {
    this.addTaskGroupId = null;
  }

  loadTaskModules(): void {
    const productId = Number(this.formModel.productId);

    if (!productId) {
      this.taskModules = [];
      return;
    }

    this.apiService.get('/product-master', { status: 1, parentId: productId }).subscribe({
      next: (response) => {
        this.taskModules = Array.isArray(response?.data) ? response.data : [];
      },
      error: () => {
        this.taskModules = [];
      },
    });
  }

  saveNewTask(): void {
    if (this.savingTask || !this.draftId) {
      return;
    }

    if (!this.newTaskForm.title.trim() || !String(this.newTaskForm.assignTo || '').trim()) {
      this.errorMessage = 'Title and Assign To are required.';
      return;
    }

    const payload = {
      projectId: this.draftId,
      title: this.newTaskForm.title.trim(),
      description: this.newTaskForm.description.trim(),
      assignTo: this.newTaskForm.assignTo,
      ticketCategoryId: this.newTaskForm.ticketCategoryId,
      productChildId: this.newTaskForm.productChildId,
      targetCompletionDate: this.newTaskForm.targetCompletionDate,
    };

    this.savingTask = true;

    this.apiService.post('/project/draftTasks', payload).subscribe({
      next: () => {
        this.savingTask = false;
        this.addTaskGroupId = null;
        this.errorMessage = '';
        void this.loadDraftTasks();
      },
      error: (error) => {
        this.savingTask = false;
        this.errorMessage = error?.error?.message || 'Failed to create draft task.';
      },
    });
  }

  private toNgbDate(value: any): any {
    if (!value) {
      return null;
    }

    if (typeof value === 'object' && value !== null && 'year' in value && 'month' in value && 'day' in value) {
      return { year: Number(value.year), month: Number(value.month), day: Number(value.day) };
    }

    const str = String(value).trim();
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (match) {
      return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
    }

    const parsed = new Date(str);

    if (!Number.isNaN(parsed.getTime())) {
      return { year: parsed.getFullYear(), month: parsed.getMonth() + 1, day: parsed.getDate() };
    }

    return null;
  }

  startEditTask(t: any): void {
    this.editingTaskId = String(t?.id || '');
    this.editTaskForm = {
      title: String(t?.title || ''),
      description: String(t?.description || ''),
      ticketCategoryId: Number(t?.ticketCategoryId || 0),
      assignTo: String(t?.assignTo || ''),
      productChildId: String(t?.productChildId || ''),
      targetCompletionDate: this.toNgbDate(t?.targetCompletionDate),
    };
    this.loadTaskModules();
  }

  cancelEditTask(): void {
    this.editingTaskId = null;
  }

  saveEditTask(): void {
    if (this.savingTask || !this.editingTaskId) {
      return;
    }

    if (!this.editTaskForm.title.trim() || !String(this.editTaskForm.assignTo || '').trim()) {
      this.errorMessage = 'Title and Assign To are required.';
      return;
    }

    const payload = {
      title: this.editTaskForm.title.trim(),
      description: this.editTaskForm.description.trim(),
      assignTo: this.editTaskForm.assignTo,
      ticketCategoryId: this.editTaskForm.ticketCategoryId,
      productChildId: this.editTaskForm.productChildId,
      targetCompletionDate: this.editTaskForm.targetCompletionDate,
    };

    this.savingTask = true;

    this.apiService.put(`/project/draftTasks/${this.editingTaskId}`, payload).subscribe({
      next: () => {
        this.savingTask = false;
        this.editingTaskId = null;
        this.errorMessage = '';
        void this.loadDraftTasks();
      },
      error: (error) => {
        this.savingTask = false;
        this.errorMessage = error?.error?.message || 'Failed to update draft task.';
      },
    });
  }

  deleteDraftTask(t: any): void {
    const id = String(t?.id || '');

    if (!id) {
      return;
    }

    const confirmed = confirm(`Delete draft task ${id}?`);

    if (!confirmed) {
      return;
    }

    this.savingTask = true;

    this.apiService.delete(`/project/draftTasks/${id}`).subscribe({
      next: () => {
        this.savingTask = false;
        this.errorMessage = '';
        void this.loadDraftTasks();
      },
      error: (error) => {
        this.savingTask = false;
        this.errorMessage = error?.error?.message || 'Failed to delete draft task.';
      },
    });
  }

  onDraftTaskDragStart(t: any): void {
    this.draggedDraftTask = t;
  }

  onDraftTaskDragOver(event: DragEvent): void {
    event.preventDefault();

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  draftTaskDragEnd(): void {
    this.draggedDraftTask = null;
  }

  onDraftTaskDrop(target: any, group: any, event: DragEvent): void {
    event.preventDefault();
    const source = this.draggedDraftTask;
    this.draggedDraftTask = null;

    if (!source || String(source.id) === String(target.id)) {
      return;
    }

    const data = Array.isArray(group?.data) ? group.data : [];
    const sourceIdx = data.findIndex((row: any) => String(row.id) === String(source.id));
    const targetIdx = data.findIndex((row: any) => String(row.id) === String(target.id));

    if (sourceIdx < 0 || targetIdx < 0) {
      return;
    }

    const reordered = [...data];
    reordered.splice(sourceIdx, 1);
    reordered.splice(targetIdx, 0, source);

    reordered.forEach((row: any, index: number) => {
      row.projectSorting = index + 1;
    });

    group.data = reordered;

    const items = reordered.map((row: any) => ({
      id: row.id,
      projectSorting: Number(row.projectSorting),
    }));

    this.apiService.put('/project/draftTasks/reorder', { items }).subscribe({
      next: () => {
        // reordered optimistically
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Failed to reorder draft tasks.';
        void this.loadDraftTasks();
      },
    });
  }

  onGroupPhaseChange(): void {
    this.scheduleAutoSave();
    void this.loadDraftTasks();
  }

  private applyDraftToForm(data: any): void {
    const rawClientId = String(data.clientId ?? '');

    this.formModel = {
      ...this.formModel,
      name: String(data.name ?? ''),
      projectTypeId: Number(data.projectTypeId ?? 0),
      projectBilleableId: Number(data.projectBilleableId ?? 0),
      productId: Number(data.productId ?? 0),
      clientId: rawClientId && rawClientId !== '0' ? rawClientId : '',
      startDate: this.parseDate(data.startDate) ?? this.formModel.startDate,
      endDate: this.parseDate(data.endDate) ?? this.formModel.endDate,
      status: Number(data.status ?? 1),
      templateMaster: String(data.templateMaster ?? ''),
      ticketCategoriesParentId: Number(data.ticketCategoriesParentId ?? 0),
      ticketBaseHours: Number(data.ticketBaseHours ?? 0),
    };

    if (data.templateName) {
      this.templateName = String(data.templateName);
    }
  }

  private mergeSavedUsers(): void {
    if (!Array.isArray(this.savedUsers) || !this.savedUsers.length) {
      return;
    }

    if (!Array.isArray(this.allUsers) || !this.allUsers.length) {
      return;
    }

    this.savedUsers.forEach((saved: any) => {
      const isChecked = Number(saved.checked) === 1 || saved.checked === true;
      const isManager = Number(saved.asManager) === 1 || saved.asManager === true;

      if (!isChecked && !isManager) {
        return;
      }

      const user = this.allUsers.find((u: any) => String(u.id) === String(saved.id));

      if (!user) {
        return;
      }

      if (isChecked) {
        user.checked = true;
      }

      if (isManager) {
        user.asManager = true;
        this.formModel.userManager = user.name;
      }
    });
  }

  scheduleAutoSave(): void {
    if (!this.draftLoaded || this.saving) {
      return;
    }

    this.autoSave$.next();
  }

  private saveDraft(): void {
    if (this.saving || !this.draftId) {
      return;
    }

    if (this.autoSaving) {
      this.pendingAutoSave = true;
      return;
    }

    const payload = this.buildDraftPayload();

    if (!payload) {
      return;
    }

    this.autoSaving = true;
    this.draftSaved = true;
    this.autoSaveError = '';

    this.apiService.put(`/project/${this.draftId}`, payload).subscribe({
      next: () => {
        this.autoSaving = false;
        this.draftSaved = true;

        this.clearAutoSaveTimer();
        this.autoSaveTimer = setTimeout(() => {
          this.draftSaved = false;
        }, 3000);

        if (this.pendingAutoSave) {
          this.pendingAutoSave = false;
          this.saveDraft();
        }
      },
      error: (error) => {
        this.autoSaving = false;
        this.pendingAutoSave = false;
        this.autoSaveError = error?.error?.message || 'Auto-save failed.';
      },
    });
  }

  private buildDraftPayload(): any {
    const payload: any = {};

    const name = String(this.formModel.name ?? '').trim();

    if (name) {
      payload.name = name;
    }

    const clientId = String(this.formModel.clientId ?? '').trim();

    if (clientId) {
      payload.clientId = clientId;
    }

    if (Number(this.formModel.projectTypeId) > 0) {
      payload.projectTypeId = Number(this.formModel.projectTypeId);
    }

    if (Number(this.formModel.projectBilleableId) > 0) {
      payload.projectBilleableId = Number(this.formModel.projectBilleableId);
    }

    if (Number(this.formModel.productId) > 0) {
      payload.productId = Number(this.formModel.productId);
    }

    if (Number(this.formModel.ticketCategoriesParentId) > 0) {
      payload.ticketCategoriesParentId = Number(this.formModel.ticketCategoriesParentId);
    }

    if (this.formModel.startDate) {
      payload.startDate = this.formModel.startDate;
    }

    if (this.formModel.endDate) {
      payload.endDate = this.formModel.endDate;
    }

    const templateMaster = String(this.formModel.templateMaster ?? '').trim();

    if (templateMaster && templateMaster !== '0') {
      payload.templateMaster = templateMaster;
    }

    if (this.formModel.ticketBaseHours !== undefined && this.formModel.ticketBaseHours !== null) {
      payload.ticketBaseHours = Number(this.formModel.ticketBaseHours);
    }

    if (Array.isArray(this.allUsers)) {
      payload.projectUsers = this.allUsers;
    }

    return Object.keys(payload).length ? payload : null;
  }

  private clearAutoSaveTimer(): void {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  ngOnDestroy(): void {
    this.clearAutoSaveTimer();
    this.destroy$.next();
    this.destroy$.complete();
  }

  saveProject(form: NgForm): void {
    if (form.invalid || this.saving || !this.canAccessPage) {
      return;
    }

    if (!this.formModel.templateMaster || !this.templateDetail) {
      this.formModel.templateMaster = ''; 
    }

    const templateProject = this.templateDetail?.project ?? {};

    const payload: any = {
      presence: 1,
      name: this.formModel.name.trim(),
      projectTypeId: Number(this.formModel.projectTypeId),
      projectBilleableId: Number(this.formModel.projectBilleableId),
      productId: Number(this.formModel.productId),
      clientId: String(this.formModel.clientId),
      startDate: this.formModel.startDate,
      endDate: this.formModel.endDate,
      status: Number(this.formModel.status),
      templateMaster: this.formModel.templateMaster.trim(),
      projectUsers: this.allUsers,
      ticketCategoriesParentId: Number(this.formModel.ticketCategoriesParentId),
      template: {
        cases: templateProject.cases ?? [],
        tasks: templateProject.tasks ?? [],
        task: templateProject.task ?? [],
        cr: templateProject.cr ?? [],
        contacts: templateProject.contacts ?? [],
        templateId: this.formModel.templateMaster.trim(),
      },
      ticketBaseHours : this.formModel.ticketBaseHours
    };

    this.saving = true;
    this.errorMessage = '';
    console.log('Payload to save project:', payload);
 
    this.apiService.put(`/project/${this.draftId}`, payload).subscribe({
      next: (response) => {
        console.log(response);
        this.saving = false;
        this.router.navigate(['/projects']).then(() => {
          void this.router.navigate(['/project', this.draftId]);
        });
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage =
          error?.error?.message || 'Failed to publish project.';
      },
    }); 
  }

  deleteDraftProject(): void {
    if (this.deleting || !this.draftId) {
      return;
    }

    const confirmed = confirm('Delete this draft project and all its draft tasks?');

    if (!confirmed) {
      return;
    }

    this.deleting = true;

    this.apiService.delete(`/project/${this.draftId}`).subscribe({
      next: () => {
        this.deleting = false;
        void this.router.navigate(['/projects']);
      },
      error: (error) => {
        this.deleting = false;
        this.errorMessage = error?.error?.message || 'Failed to delete draft project.';
      },
    });
  }

  goBack(): void {
    void this.router.navigate(['/projects']);
  }

  trackById(_: number, row: any): any {
    return row?.id;
  }

  private defaultDateStruct(): { year: number; month: number; day: number } {
    const today = new Date();

    return {
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      day: today.getDate(),
    };
  }

  private defaultForm(): ProjectFormModel {
    const today = this.defaultDateStruct();

    return {
      id: '',
      name: '',
      projectTypeId: 0,
      projectBilleableId: 0,
      productId: 0,
      clientId: '',
      startDate: today,
      endDate: today,
      status: 1,
      templateMaster: '',
      userManager: '',
      ticketCategoriesParentId: 0,
      ticketBaseHours: 0,
    };
  }

  loadTemplateMaster(content: any): void {
    alert('On process, coming soon');
    // if (this.templateName) {
    //   return;
    // }

    // this.modalService.open(content, { size: 'xl' });
    // this.loadingTemplateMaster = true;
  }

  templateDetail : any = null;
  selectTemplateMaster(template: any): void {
    if (!template) {
      return;
    }

    this.templateName = template.name;
    this.formModel.templateMaster = String(template.id);

    this.apiService.get(`/template/${template.id}`).subscribe({
      next: (response) => {

        const templateDetail = response?.data ?? response;
        const parsedTemplate = this.parseTemplatePayload(
          templateDetail,
          template,
        );

        this.formModel = {
          ...this.formModel,
          ...parsedTemplate.formModel,
        };


              //  console.log('Template detail response:', response.data.json);
        // convert json to object if it's a string
        this.templateDetail = this.tryParseJson(response.data.json) ?? response.data.json;
        console.log('Parsed template detail:', this.templateDetail);

        this.loadingTemplateMaster = false;
        this.modalService.dismissAll();
      },
      error: (error) => {
        console.error('Error loading template detail:', error);
        this.loadingTemplateMaster = false;
      },
    });
  }

  private parseTemplatePayload(
    templateDetail: any,
    template: any,
  ): {
    formModel: Partial<ProjectFormModel>;
  } {
    const rawJson = templateDetail?.json ?? templateDetail;
    const parsedJson = this.tryParseJson(rawJson);
    const projectData = parsedJson?.project ?? parsedJson;

    const users = Array.isArray(projectData?.users) ? projectData.users : [];
    const managerUser = users.find((user: any) => Boolean(user?.asManager));

    this.allUsers = users.map((user: any) => ({
      id: user.id,
      name: String(user.name || ''),
      userAuthLevel: user.userAuthLevel || '',
      checked: Boolean(user.checked || user.asManager),
      asManager: Boolean(user.asManager),
      division: user.division || '',
      readonly: false,
    }));
    this.users = [...this.allUsers];

    return {
      formModel: {
        id: String(projectData?.id ?? this.formModel.id),
        name: String(projectData?.name ?? this.formModel.name),
        projectTypeId: Number(
          projectData?.projectTypeId ?? this.formModel.projectTypeId,
        ),
        projectBilleableId: Number(
          projectData?.projectBilleableId ?? this.formModel.projectBilleableId,
        ),
        productId: Number(projectData?.productId ?? this.formModel.productId),
        clientId: String(projectData?.clientId ?? this.formModel.clientId),
        startDate:
          this.parseDate(projectData?.startDate) ?? this.formModel.startDate,
        endDate: this.parseDate(projectData?.endDate) ?? this.formModel.endDate,
        status: Number(projectData?.status ?? this.formModel.status),
        templateMaster: String(template?.id ?? this.formModel.templateMaster),
        userManager: String(
          managerUser?.name ??
            projectData?.userManager ??
            this.formModel.userManager,
        ),
        ticketCategoriesParentId: Number(
          projectData?.ticketCategoriesParentId ??
            this.formModel.ticketCategoriesParentId,
        ),
        ticketBaseHours: this.formModel.ticketBaseHours, 
      },
    };
  }

  private tryParseJson(value: any): any {
    if (!value) {
      return null;
    }

    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    }

    return value;
  }

  private parseDate(
    value: any,
  ): { year: number; month: number; day: number } | null {
    if (!value) {
      return null;
    }

    if (
      typeof value === 'object' &&
      value !== null &&
      'year' in value &&
      'month' in value &&
      'day' in value
    ) {
      return {
        year: Number(value.year),
        month: Number(value.month),
        day: Number(value.day),
      };
    }

    if (typeof value === 'string') {
      const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

      if (match) {
        return {
          year: Number(match[1]),
          month: Number(match[2]),
          day: Number(match[3]),
        };
      }
    }

    return null;
  }
}
