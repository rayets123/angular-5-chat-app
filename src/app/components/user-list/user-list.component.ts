import { Component, OnInit, Input, ChangeDetectionStrategy } from '@angular/core';
import ChatServer, { UserListUser } from '../../../../shared-interfaces/server.interface';
import { Observable } from 'rxjs/Observable';
import { SettingsService } from '../../services/settings.service';
import 'rxjs/add/observable/interval';
import { OnDestroy, AfterViewInit } from '@angular/core/src/metadata/lifecycle_hooks';
import { Subscription } from 'rxjs/Subscription';
import { IShContextMenuItem } from 'ng2-right-click-menu/sh-context-menu.models';
import { WebsocketService } from '../../services/websocket.service';
import { ChangeDetectorRef } from '@angular/core';
import { DirectMessageService } from '../../services/direct-message.service';
import { FriendRequestService } from '../../services/friend-request.service';
@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserListComponent implements OnInit, OnDestroy, AfterViewInit {
  public subscriptions: Subscription[] = [];
  public preventListUpdate = false;
  public menuItems: IShContextMenuItem[];
  @Input() currentServer: ChatServer;

  constructor(
    public settingsService: SettingsService,
    public wsService: WebsocketService,
    private ref: ChangeDetectorRef,
    private dmService: DirectMessageService,
    private friendRequest: FriendRequestService,
  ) {
    this.addContextMenuItems();
  }

  ngAfterViewInit() {
    this.subscriptions.push(
      Observable.interval(60000)
        .subscribe(() => {
          /* istanbul ignore next */
          // Long poll the user list
          this.fetchUserList();
        }),
      this.settingsService.invertedThemeSubj.subscribe(() => {
        this.ref.detectChanges();
      }),
    );
  }

  get userList() {
    return this.currentServer.userList;
  }

  get onlineUsers() {
    return this.userList &&
      this.userList
        .filter(usr => usr.online)
        .sort(sortAlphabetically)
        .slice(0, 100);
  }

  get offlineUsers() {
    return this.userList &&
      this.userList
        .filter(usr => !usr.online)
        .sort(sortAlphabetically)
        .slice(0, 100);
  }

  fetchUserList() {
    if (this.currentServer && this.wsService.socket.connected) {
      this.wsService.socket.emit('get-user-list', this.currentServer._id);
    }
  }

  ngOnInit() {
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  userListTrackBy(index, user) {
    return user._id;
  }

  addContextMenuItems() {
    /* istanbul ignore next */
    this.menuItems = [
      {
        label: (ctx) => ctx._id,
        disabled: (ctx) => true,
      },
      {
        label: 'Send Message',
        onClick: (ctx) => this.sendUserMessage(ctx.dataContext._id),
      },
      {
        label: 'Add Friend',
        onClick: (ctx) => this.addFriend(ctx.dataContext._id),
      },
      {
        label: '<span class="text-danger">Remove Friend</span>',
        onClick: (ctx) => this.removeFriend(ctx.dataContext._id),
      },
    ];
  }

  addFriend(userId) {
    this.friendRequest.sendFriendRequest(userId);
  }

  removeFriend(userId) {
    this.friendRequest.removeFriend(userId);
  }

  sendUserMessage(userId) {
    this.dmService.startPm(userId);
  }

  onMouseEnter(enter: boolean) {
    this.preventListUpdate = enter && this.userList !== undefined;
  }
}

/* istanbul ignore next */
function sortAlphabetically(a: UserListUser, b: UserListUser) {
  return a.username > b.username ? -1
    : a.username < b.username ? 1
      : 0;
}
